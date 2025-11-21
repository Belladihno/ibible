// import { Test, TestingModule } from '@nestjs/testing';
// import { getRepositoryToken } from '@nestjs/typeorm';
// import { BibleService } from './bible.service';
// import { BibleBook } from 'src/entities/bible-book.entity';
// import { HttpService } from '@nestjs/axios';
// import { ConfigService } from '@nestjs/config';
// import { of } from 'rxjs';

// describe('BibleBooksService', () => {
//   let service: BibleService;
//   let mockRepository: any;
//   let mockHttpService: any;

//   beforeEach(async () => {
//     mockRepository = {
//       find: jest.fn(),
//       save: jest.fn(),
//       create: jest.fn(),
//       findOne: jest.fn(),
//     };

//     mockHttpService = {
//       get: jest.fn(),
//     };

//     const module: TestingModule = await Test.createTestingModule({
//       providers: [
//         BibleService,
//         {
//           provide: getRepositoryToken(BibleBook),
//           useValue: mockRepository,
//         },
//         {
//           provide: HttpService,
//           useValue: mockHttpService,
//         },
//         {
//           provide: ConfigService,
//           useValue: {
//             get: jest.fn().mockReturnValue('test-api-key'),
//           },
//         },
//       ],
//     }).compile();

//     service = module.get<BibleService>(BibleService);
//   });

//   it('should return cached books from database', async () => {
//     const mockBooks = [
//       {
//         id: 1,
//         name: 'Genesis',
//         testament: 'old',
//         bookOrder: 1,
//         totalChapters: 50,
//         abbreviation: 'Gen',
//         externalId: 'GEN',
//       },
//     ];

//     mockRepository.find.mockResolvedValue(mockBooks);

//     const result = await service.getAllBooks();

//     expect(result).toEqual(mockBooks);
//     expect(mockRepository.find).toHaveBeenCalled();
//     expect(mockHttpService.get).not.toHaveBeenCalled();
//   });

//   it('should fetch from API when database is empty', async () => {
//     mockRepository.find.mockResolvedValue([]);
//     const mockApiResponse = {
//       data: {
//         data: [
//           {
//             id: 'GEN',
//             bibleId: 'de4e12af7f28f599-02',
//             abbreviation: 'Gen',
//             name: 'Genesis',
//             nameLong: 'The First Book of Moses',
//           },
//         ],
//       },
//     };

//     mockHttpService.get.mockReturnValue(of(mockApiResponse));
//     mockRepository.create.mockImplementation((data) => data);
//     mockRepository.save.mockResolvedValue([]);
//     mockRepository.find
//       .mockResolvedValueOnce([])
//       .mockResolvedValueOnce([{ id: 1, name: 'Genesis' }]);

//     const result = await service.getAllBooks();

//     expect(mockHttpService.get).toHaveBeenCalled();
//     expect(mockRepository.save).toHaveBeenCalled();
//   });
// });
