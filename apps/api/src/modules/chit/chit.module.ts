import { Module } from '@nestjs/common';
import { DashboardController, DashboardService } from './dashboard';
import { GroupsController, GroupsService } from './groups';
import { LedgerService } from './ledger.service';
import { MembersController, MembersService } from './members';
import { PaymentModesController, PaymentModesService } from './payment-modes';
import { SuperadminSeedService } from '../../prisma/superadmin-seed.service';
import { PaymentsController, PaymentsService } from './payments';
import { TemplatesController, TemplatesService } from './templates';

@Module({
  controllers: [
    DashboardController,
    GroupsController,
    MembersController,
    PaymentModesController,
    PaymentsController,
    TemplatesController,
  ],
  providers: [
    DashboardService,
    GroupsService,
    LedgerService,
    MembersService,
    PaymentModesService,
    PaymentsService,
    TemplatesService,
    SuperadminSeedService,
  ],
  exports: [PaymentModesService],
})
export class ChitModule {}
