import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadFile(file);
  }

  @Get(':id')
  async download(@Param('id') id: string, @Res() res: Response) {
    const { stream, metadata } = await this.filesService.downloadFile(id);
    const contentType =
      (metadata.metadata as { contentType?: string } | undefined)
        ?.contentType ?? 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${metadata.filename}"`,
    });

    stream.pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.filesService.deleteFile(id);
    return { success: true, message: 'File deleted' };
  }
}
