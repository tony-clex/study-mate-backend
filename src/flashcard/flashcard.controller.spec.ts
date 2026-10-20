import { FlashcardController } from './flashcard.controller';

describe('FlashcardController', () => {
  it('extracts source text from a file URL when sourceText is missing', async () => {
    const flashcardService = {
      generateFlashcards: jest.fn().mockResolvedValue({
        id: 'deck-1',
        title: 'test.pdf Flashcards',
        cardCount: 1,
        cards: [],
      }),
    };

    const processingService = {
      extractText: jest.fn().mockResolvedValue('This is extracted study text.'),
    };

    const controller = new FlashcardController(
      flashcardService as any,
      processingService as any,
    );

    await controller.generateFlashcards({
      numCards: 2,
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf',
      mimeType: 'application/pdf',
    });

    expect(processingService.extractText).toHaveBeenCalledWith(
      'https://example.com/test.pdf',
      'application/pdf',
    );
    expect(flashcardService.generateFlashcards).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceText: 'This is extracted study text.',
      }),
    );
  });
});
