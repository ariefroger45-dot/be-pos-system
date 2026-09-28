import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import 'multer';

@Injectable()
export class FilesService {
  private bucket: GridFSBucket;

  constructor(@InjectConnection() private readonly connection: Connection) {
    if (!this.connection.db) {
      throw new Error('MongoDB connection is not initialized');
    }

    this.bucket = new GridFSBucket(this.connection.db, {
      bucketName: 'document',
    });
  }

  // Fungsi Upload

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ id: string; filename: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(file.originalname, {
        metadata: { contentType: file.mimetype },
      });

      Readable.from(file.buffer)
        .pipe(uploadStream)
        .on('error', (error) => reject(error))
        .on('finish', () => {
          resolve({
            id: uploadStream.id.toString(),
            filename: file.originalname,
          });
        });
    });

    // Download
  }
  async downloadFile(id: string) {
    const _id = new ObjectId(id);

    const files = await this.bucket.find({ _id }).toArray();
    if (!files.length) throw new NotFoundException('File Not Found');

    return {
      stream: this.bucket.openDownloadStream(_id),
      metadata: files[0],
    };
  }

  // DELETE

  async deleteFile(id: string): Promise<void> {
    try {
      await this.bucket.delete(new ObjectId(id));
    } catch {
      throw new NotFoundException('File not found');
    }
  }
}
