import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto, ContactResponseDto } from './dto/contact-us.dto';

@ApiTags('Contact Us')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @ApiOperation({
    summary: 'Submit contact form',
    description: 'Allows users to send messages through the contact form',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contact form submitted successfully',
    type: ContactResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Name is required',
          'Please provide a valid email address',
          'Enquiry type must be one of the valid options',
          'Message must be at least 10 characters long',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error',
    schema: {
      example: {
        statusCode: 500,
        message: 'Failed to submit contact form. Please try again later.',
        error: 'Internal Server Error',
      },
    },
  })
  async create(@Body() createContactDto: CreateContactDto) {
    console.log('createContactDto', createContactDto);
    return;
  }
}
