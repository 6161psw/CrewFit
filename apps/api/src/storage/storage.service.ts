import { BadRequestException, Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, extname, resolve, sep } from 'path';
import { Env } from '../config/env';

/** 로컬 디스크 저장 (도커 볼륨). 추후 S3 로 교체 시 이 서비스만 변경 */
@Injectable()
export class StorageService {
  private readonly root: string;
  readonly maxBytes: number;

  constructor(config: ConfigService<Env, true>) {
    this.root = resolve(config.get('UPLOAD_DIR', { infer: true }));
    this.maxBytes = config.get('MAX_UPLOAD_MB', { infer: true }) * 1024 * 1024;
  }

  async save(buffer: Buffer, originalName: string): Promise<string> {
    const now = new Date();
    const rel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}${extname(originalName).toLowerCase()}`;
    const abs = this.absolute(rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    return rel;
  }

  absolute(rel: string): string {
    const abs = resolve(this.root, rel);
    if (!abs.startsWith(this.root + sep)) throw new BadRequestException('invalid path');
    return abs;
  }

  async remove(rel?: string | null) {
    if (rel) await unlink(this.absolute(rel)).catch(() => undefined);
  }
}

@Global()
@Module({ providers: [StorageService], exports: [StorageService] })
export class StorageModule {}
