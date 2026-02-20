import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  answer(question: string) {
    return {
      answer: `This is a stubbed response for: ${question}`,
      nextRequiredAction: 'Upload proof of address',
      checklist: ['Passport', 'Proof of address', 'Application form']
    };
  }
}
