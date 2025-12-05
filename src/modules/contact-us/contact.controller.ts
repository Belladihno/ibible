import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Contact } from 'src/entities/contact-us.entity';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/contact-us.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a contact message',
    description: 'Allows clients to send messages to the user',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Contact message successfully submitted',
    type: Contact,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to save contact message',
  })
  async createContact(@Body() createContactDto: CreateContactDto): Promise<{
    statusCode: number;
    message: string;
    data: Contact;
  }> {
    const contact = await this.contactService.createContact(createContactDto);

    return {
      statusCode: HttpStatus.CREATED,
      message:
        'Your message has been successfully submitted. We will get back to you soon.',
      data: contact,
    };
  }
}
