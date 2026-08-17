import { ApiError } from '../utils/ApiError.js';
import { getPlan, isWithinLimit, DEFAULT_PLAN } from '../constants/plans.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { eventRepository } from '../repositories/event.repository.js';
import { guestRepository } from '../repositories/guest.repository.js';

/**
 * The only place plan limits are enforced. Called from the services that
 * create/publish/add resources (events.service.js, guests.service.js) —
 * never trust a frontend "disable this button" check alone.
 */
export const planService = {
  async getUserPlanId(userId) {
    const subscription = await subscriptionRepository.findActiveByUserId(userId);
    return subscription?.plan || DEFAULT_PLAN;
  },

  async assertCanCreateEvent(userId) {
    const planId = await this.getUserPlanId(userId);
    const plan = getPlan(planId);
    const currentCount = await eventRepository.countByUserId(userId);

    if (!isWithinLimit(currentCount, plan.limits.maxEvents)) {
      throw ApiError.forbidden(
        `Your ${plan.name} plan allows up to ${plan.limits.maxEvents} event(s). Upgrade to create more.`
      );
    }
  },

  async assertCanPublish(userId) {
    const planId = await this.getUserPlanId(userId);
    const plan = getPlan(planId);
    const publishedCount = await eventRepository.countPublishedByUserId(userId);

    if (!isWithinLimit(publishedCount, plan.limits.maxPublishedInvitations)) {
      throw ApiError.forbidden(
        `Your ${plan.name} plan allows up to ${plan.limits.maxPublishedInvitations} published invitation(s). Upgrade or unpublish another event first.`
      );
    }
  },

  async assertCanAddGuest(userId, eventId, additionalCount = 1) {
    const planId = await this.getUserPlanId(userId);
    const plan = getPlan(planId);
    const stats = await guestRepository.getStatsByEventId(eventId);

    if (!isWithinLimit(stats.total + additionalCount - 1, plan.limits.maxGuestsPerEvent)) {
      throw ApiError.forbidden(
        `Your ${plan.name} plan allows up to ${plan.limits.maxGuestsPerEvent} guests per event. Upgrade to add more.`
      );
    }
  },
};
