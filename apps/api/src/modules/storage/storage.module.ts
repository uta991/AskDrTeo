import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FILE_STORAGE, VIDEO_STORAGE } from './storage.types';
import { LocalFileProvider } from './providers/local-file.provider';
import { LocalVideoProvider } from './providers/local-video.provider';
import { R2FileProvider } from './providers/r2-file.provider';
import { BunnyVideoProvider } from './providers/bunny-video.provider';

/**
 * საცავის პროვაიდერების არჩევა.
 *
 * არჩევანი `.env`-შია, არა კოდში. `FILE_STORAGE` და `VIDEO_STORAGE`
 * ტოკენებით ინჟექცია ნიშნავს, რომ სერვისებმა კონკრეტული პროვაიდერის
 * სახელიც კი არ იციან.
 */
@Global()
@Module({
  providers: [
    LocalFileProvider,
    LocalVideoProvider,
    {
      provide: FILE_STORAGE,
      inject: [ConfigService, LocalFileProvider],
      useFactory: (config: ConfigService, local: LocalFileProvider) => {
        const driver = config.get<string>('storage.fileDriver', 'local');
        if (driver !== 'r2') return local;

        Logger.log('ფაილების საცავი: Cloudflare R2', 'StorageModule');
        return new R2FileProvider(config);
      },
    },
    {
      provide: VIDEO_STORAGE,
      inject: [ConfigService, LocalVideoProvider],
      useFactory: (config: ConfigService, local: LocalVideoProvider) => {
        const driver = config.get<string>('storage.videoDriver', 'local');
        if (driver !== 'bunny') return local;

        Logger.log('ვიდეოს საცავი: Bunny Stream', 'StorageModule');
        return new BunnyVideoProvider(config);
      },
    },
  ],
  exports: [FILE_STORAGE, VIDEO_STORAGE],
})
export class StorageModule {}
