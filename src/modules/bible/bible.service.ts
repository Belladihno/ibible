import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BibleBook } from '../../entities/bible-book.entity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ExternalBibleBook,
  ExternalBibleBooksResponse,
} from '../../shared/types/bible.types';

@Injectable()
export class BibleService {
  private readonly API_BASE_URL = 'https://rest.api.bible';
  private readonly BIBLE_ID = 'de4e12af7f28f599-02'; // KJV
  private readonly logger = new Logger(BibleService.name);
  constructor(
    @InjectRepository(BibleBook)
    private readonly bibleBookRepository: Repository<BibleBook>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getAllBooks(forceRefresh = false): Promise<BibleBook[]> {
    try {
      if (!forceRefresh) {
        const cachedBooks = await this.bibleBookRepository.find({
          order: { bookOrder: 'ASC' },
        });

        if (cachedBooks.length > 0) {
          return cachedBooks;
        }
      }

      const externalBooks = await this.fetchBooksFromExternalAPI();

      const savedBooks = await this.saveBooksToDatabase(externalBooks);

      return savedBooks;
    } catch (error) {
      this.logger.error('Error fectching Bible books', error.stack);
      throw new InternalServerErrorException('Failed to retrieve Bible Books');
    }
  }

  private async fetchBooksFromExternalAPI(): Promise<ExternalBibleBook[]> {
    const apiKey = this.configService.get<string>('BIBLE_API_KEY');
    // const apiUrl = this.configService.get<string>('BIBLE_API');

    if (!apiKey) {
      throw new Error('BIBLE_API_KEY is not set in environment variables');
    }
    // if (!apiUrl) {
    //   throw new Error('BIBLE_API is not set in environment variables');
    // }

    const url = `${this.API_BASE_URL}/bibles/${this.BIBLE_ID}/books`;

    // eslint-disable-next-line no-useless-catch
    try {
      const response = await firstValueFrom(
        this.httpService.get<ExternalBibleBooksResponse>(url, {
          headers: {
            'api-key': apiKey,
          },
        }),
      );

      return response.data.data;
    } catch (error) {
      throw error;
    }
  }

  private async saveBooksToDatabase(
    externalBooks: ExternalBibleBook[],
  ): Promise<BibleBook[]> {
    // Map of book IDs to testament and chapter counts
    const bookMetadata = this.getBookMetadata();

    const booksToSave = externalBooks.map((book, index) => {
      const metadata = bookMetadata[book.id] || {
        testament: this.determineTestament(book.id),
        totalChapters: 0, // Will need to be updated later
      };

      return this.bibleBookRepository.create({
        name: book.name,
        testament: metadata.testament,
        bookOrder: index + 1,
        totalChapters: metadata.totalChapters,
        abbreviation: book.abbreviation,
        externalId: book.id,
        nameLong: book.nameLong,
      });
    });

    // Use upsert to handle duplicates
    await this.bibleBookRepository.save(booksToSave, {
      chunk: 20, // Save in chunks for better performance
    });

    return this.bibleBookRepository.find({
      order: { bookOrder: 'ASC' },
    });
  }

  private determineTestament(bookId: string): 'old' | 'new' {
    const oldTestamentBooks = [
      'GEN',
      'EXO',
      'LEV',
      'NUM',
      'DEU',
      'JOS',
      'JDG',
      'RUT',
      '1SA',
      '2SA',
      '1KI',
      '2KI',
      '1CH',
      '2CH',
      'EZR',
      'NEH',
      'EST',
      'JOB',
      'PSA',
      'PRO',
      'ECC',
      'SNG',
      'ISA',
      'JER',
      'LAM',
      'EZK',
      'DAN',
      'HOS',
      'JOL',
      'AMO',
      'OBA',
      'JON',
      'MIC',
      'NAM',
      'HAB',
      'ZEP',
      'HAG',
      'ZEC',
      'MAL',
    ];

    return oldTestamentBooks.includes(bookId) ? 'old' : 'new';
  }

  private getBookMetadata(): Record<
    string,
    { testament: 'old' | 'new'; totalChapters: number }
  > {
    return {
      // Old Testament
      GEN: { testament: 'old', totalChapters: 50 },
      EXO: { testament: 'old', totalChapters: 40 },
      LEV: { testament: 'old', totalChapters: 27 },
      NUM: { testament: 'old', totalChapters: 36 },
      DEU: { testament: 'old', totalChapters: 34 },
      JOS: { testament: 'old', totalChapters: 24 },
      JDG: { testament: 'old', totalChapters: 21 },
      RUT: { testament: 'old', totalChapters: 4 },
      '1SA': { testament: 'old', totalChapters: 31 },
      '2SA': { testament: 'old', totalChapters: 24 },
      '1KI': { testament: 'old', totalChapters: 22 },
      '2KI': { testament: 'old', totalChapters: 25 },
      '1CH': { testament: 'old', totalChapters: 29 },
      '2CH': { testament: 'old', totalChapters: 36 },
      EZR: { testament: 'old', totalChapters: 10 },
      NEH: { testament: 'old', totalChapters: 13 },
      EST: { testament: 'old', totalChapters: 10 },
      JOB: { testament: 'old', totalChapters: 42 },
      PSA: { testament: 'old', totalChapters: 150 },
      PRO: { testament: 'old', totalChapters: 31 },
      ECC: { testament: 'old', totalChapters: 12 },
      SNG: { testament: 'old', totalChapters: 8 },
      ISA: { testament: 'old', totalChapters: 66 },
      JER: { testament: 'old', totalChapters: 52 },
      LAM: { testament: 'old', totalChapters: 5 },
      EZK: { testament: 'old', totalChapters: 48 },
      DAN: { testament: 'old', totalChapters: 12 },
      HOS: { testament: 'old', totalChapters: 14 },
      JOL: { testament: 'old', totalChapters: 3 },
      AMO: { testament: 'old', totalChapters: 9 },
      OBA: { testament: 'old', totalChapters: 1 },
      JON: { testament: 'old', totalChapters: 4 },
      MIC: { testament: 'old', totalChapters: 7 },
      NAM: { testament: 'old', totalChapters: 3 },
      HAB: { testament: 'old', totalChapters: 3 },
      ZEP: { testament: 'old', totalChapters: 3 },
      HAG: { testament: 'old', totalChapters: 2 },
      ZEC: { testament: 'old', totalChapters: 14 },
      MAL: { testament: 'old', totalChapters: 4 },
      // New Testament
      MAT: { testament: 'new', totalChapters: 28 },
      MRK: { testament: 'new', totalChapters: 16 },
      LUK: { testament: 'new', totalChapters: 24 },
      JHN: { testament: 'new', totalChapters: 21 },
      ACT: { testament: 'new', totalChapters: 28 },
      ROM: { testament: 'new', totalChapters: 16 },
      '1CO': { testament: 'new', totalChapters: 16 },
      '2CO': { testament: 'new', totalChapters: 13 },
      GAL: { testament: 'new', totalChapters: 6 },
      EPH: { testament: 'new', totalChapters: 6 },
      PHP: { testament: 'new', totalChapters: 4 },
      COL: { testament: 'new', totalChapters: 4 },
      '1TH': { testament: 'new', totalChapters: 5 },
      '2TH': { testament: 'new', totalChapters: 3 },
      '1TI': { testament: 'new', totalChapters: 6 },
      '2TI': { testament: 'new', totalChapters: 4 },
      TIT: { testament: 'new', totalChapters: 3 },
      PHM: { testament: 'new', totalChapters: 1 },
      HEB: { testament: 'new', totalChapters: 13 },
      JAS: { testament: 'new', totalChapters: 5 },
      '1PE': { testament: 'new', totalChapters: 5 },
      '2PE': { testament: 'new', totalChapters: 3 },
      '1JN': { testament: 'new', totalChapters: 5 },
      '2JN': { testament: 'new', totalChapters: 1 },
      '3JN': { testament: 'new', totalChapters: 1 },
      JUD: { testament: 'new', totalChapters: 1 },
      REV: { testament: 'new', totalChapters: 22 },
    };
  }

  async getBooksByTestament(testament: 'old' | 'new'): Promise<BibleBook[]> {
    const allBooks = await this.getAllBooks();
    return allBooks.filter((book) => book.testament === testament);
  }
}
