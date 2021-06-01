import { NextFunction, Request, Response, Router } from 'express';
import { StartShift, handleStartShift } from './handler';
import { updateCashRegister } from '../processCashRegister';
import { getCashRegisterStreamName } from '../cashRegister';
import { isCommand } from '../../core/commands';

export const route = (router: Router) =>
  router.post(
    '/cash-registers/:id/shifts',
    async function (request: Request, response: Response, next: NextFunction) {
      try {
        const command = mapRequestToCommand(request);

        if (!isCommand(command)) {
          next({ status: 400, message: command });
          return;
        }

        const streamName = getCashRegisterStreamName(
          command.data.cashRegisterId
        );

        const result = await updateCashRegister(
          streamName,
          command,
          handleStartShift
        );

        switch (result) {
          case 'STREAM_NOT_FOUND':
            response.sendStatus(404);
            break;
          case 'SHIFT_ALREADY_STARTED':
            response.sendStatus(409);
            break;
          default:
            response.sendStatus(200);
            break;
        }
      } catch (error) {
        next(error);
      }
    }
  );

function mapRequestToCommand(
  request: Request
): StartShift | 'MISSING_CASH_REGISTER_ID' | 'MISSING_CASHIER_ID' {
  if (typeof request.params.id !== 'string') {
    return 'MISSING_CASH_REGISTER_ID';
  }

  if (typeof request.body.cashierId !== 'string') {
    return 'MISSING_CASHIER_ID';
  }

  return {
    type: 'start-shift',
    data: {
      cashRegisterId: request.params.id,
      cashierId: request.body.cashierId,
    },
  };
}
