import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(@Inject(WalletService) private readonly wallet: WalletService) {}

  @Get('documents')
  async listDocuments() {
    return this.wallet.list();
  }

  @Post('documents')
  async uploadDocument(
    @Body()
    body: {
      category: string;
      filename: string;
      issueDate?: string;
      expiryDate?: string;
      issuingAuthority?: string;
      metadata?: {
        documentNumber?: string;
        fullName?: string;
        dateOfBirth?: string;
        nationality?: string;
        scanConfidence?: number;
        source?: 'camera_ocr' | 'manual' | 'government_registry';
      };
    }
  ) {
    return this.wallet.upload(body);
  }

  @Delete('documents/:id')
  async deleteDocument(@Param('id') id: string) {
    return this.wallet.softDelete(id);
  }

  @Post('documents/:id/share')
  async shareDocument(
    @Param('id') id: string,
    @Body() body: { ttlHours?: number; role?: 'advisor' | 'admin' }
  ) {
    return this.wallet.createShareLink(id, body.ttlHours ?? 24, body.role ?? 'advisor');
  }

  @Get('documents/:id/access-log')
  accessLog(@Param('id') id: string) {
    return this.wallet.listAccessLog(id);
  }

  @Get('share/:shareId')
  async accessShare(@Param('shareId') shareId: string, @Query('actor') actor?: string) {
    return this.wallet.accessShare(shareId, actor ?? 'external-user');
  }
}
