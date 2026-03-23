import { Module } from '@nestjs/common';
import { CustomersController } from './controller/customers.controller';
import { CustomersService } from './service/customers.service';
import { CustomersRepository } from './repository/customers.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
