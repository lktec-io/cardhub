import { ticketsService } from '../services/tickets.service.js';
import {
  assertEventSlug,
  assertNoPaymentSecrets,
  assertOrderToken,
  validateCreateTicketOrderPayload,
  validateStartPaymentPayload,
} from '../validators/tickets.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function requestMeta(req) {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
}

export const ticketsController = {
  listEvents: asyncHandler(async (req, res) => {
    const data = await ticketsService.listEvents(req.query);
    sendSuccess(res, { data: { ...data, paymentMode: ticketsService.getPaymentMode() } });
  }),

  getEvent: asyncHandler(async (req, res) => {
    assertEventSlug(req.params.slug);
    const data = await ticketsService.getEventBySlug(req.params.slug);
    sendSuccess(res, { data });
  }),

  createOrder: asyncHandler(async (req, res) => {
    assertNoPaymentSecrets(req.body);
    const input = validateCreateTicketOrderPayload(req.body);
    const order = await ticketsService.createOrder(input, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Tickets reserved. Complete payment to confirm.', data: { order } });
  }),

  getOrder: asyncHandler(async (req, res) => {
    assertOrderToken(req.params.token);
    const order = await ticketsService.getOrderByToken(req.params.token);
    sendSuccess(res, { data: { order } });
  }),

  startPayment: asyncHandler(async (req, res) => {
    assertOrderToken(req.params.token);
    assertNoPaymentSecrets(req.body);
    const { phone } = validateStartPaymentPayload(req.body);
    const result = await ticketsService.startPayment(req.params.token, { phone });
    sendSuccess(res, { message: result.message || 'Payment started', data: result });
  }),

  /** DEMO PAYMENT MODE only. Takes no body at all: the demo PIN never leaves the browser. */
  confirmDemoPayment: asyncHandler(async (req, res) => {
    assertOrderToken(req.params.token);
    assertNoPaymentSecrets(req.body);
    const order = await ticketsService.confirmDemoPayment(req.params.token, requestMeta(req));
    sendSuccess(res, { message: order.status === 'paid' ? 'Demo payment confirmed' : 'Order updated', data: { order } });
  }),

  getTicket: asyncHandler(async (req, res) => {
    const ticket = await ticketsService.getTicketByToken(req.params.token);
    sendSuccess(res, { data: { ticket } });
  }),

  verify: asyncHandler(async (req, res) => {
    const verification = await ticketsService.verifyTicket(req.params.token);
    sendSuccess(res, { data: verification });
  }),
};
