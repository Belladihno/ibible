import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private readonly logger = new Logger(WsJwtGuard.name);

    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();

            // Extract token from handshake headers
            const authHeader = client.handshake.headers.authorization;

            if (!authHeader) {
                this.logger.warn('No authorization header in WebSocket handshake');
                throw new WsException('Unauthorized: No token provided');
            }

            const token = authHeader.replace('Bearer ', '');

            // Verify and decode JWT
            const payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
            });

            // Attach user info to client for later use
            client.data.user = {
                userId: payload.sub || payload.userId || payload.id,
                email: payload.email,
            };

            this.logger.log(`WebSocket authenticated for user: ${client.data.user.userId}`);
            return true;
        } catch (error) {
            this.logger.error(`WebSocket authentication failed: ${error.message}`);
            throw new WsException('Unauthorized: Invalid token');
        }
    }
}
