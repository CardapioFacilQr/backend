import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { QueryFailedError } from 'typeorm';
import type { JwtPayload } from '../common/interfaces/auth-user.interface.js';
import { RestaurantsService } from '../restaurants/restaurants.service.js';
import type { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 10;
// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar isso.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly restaurants: RestaurantsService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException('E-mail já cadastrado');
    }

    let user: User;
    try {
      user = await this.users.create({
        name: dto.name,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      });
    } catch (err) {
      // Corrida entre dois cadastros com o mesmo e-mail (violação de unique).
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string })?.code === '23505'
      ) {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw err;
    }

    const restaurant = dto.restaurantName
      ? await this.restaurants.create(user.id, dto.restaurantName)
      : null;

    return { ...(await this.buildToken(user)), restaurant };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.buildToken(user);
  }

  private async buildToken(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      user: { id: user.id, name: user.name, email: user.email },
    };
  }
}
