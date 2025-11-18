import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserPayload } from './strategy/interface';
import { AuthProvider } from 'src/users/enums/user.enums';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async validateGoogleUser(userDetails: UserPayload) {
    let user = await this.usersService.findOneByEmail(userDetails.email);

    if (user) {
      if (user.authProvider === AuthProvider.EMAIL) {
        throw new BadRequestException(
          'An account with this email already exists. Please sign in using your email and password.',
        );
      }

      return this.googleSignIn(user);
    } else {
      return this.googleSignUp(userDetails);
    }
  }

  async googleSignIn(userDetails: UserPayload) {
    return {
      msg: `Google signin successful for user: ${userDetails.email}`,
      user: userDetails,
    };
  }

  async googleSignUp(userDetails: UserPayload) {
    const payload = {
      email: userDetails.email,
      fullName: `${userDetails.firstName} ${userDetails.lastName}`,
      profilePicture: userDetails.picture,
      authProvider: AuthProvider.GOOGLE,
    };

    const newUser = await this.usersService.create(payload);
    return {
      msg: `Google signup successful. New user created: ${newUser.email}`,
      user: newUser,
    };
  }
}
