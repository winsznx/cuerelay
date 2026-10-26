import { base44 } from '@/api/base44Client';

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function call(name, payload) {
  try {
    const result = await base44.functions.invoke(name, payload);
    return result.data;
  } catch (err) {
    const data = err?.data;
    if (data?.error) throw new ApiError(data.error.code, data.error.message, data.error.details);
    throw new ApiError('SERVICE_UNAVAILABLE', err?.message ?? 'Something went wrong. Try again.');
  }
}

export const api = {
  listEvents: () => call('listEvents', {}),
  createEvent: (payload) => call('createEvent', payload),
  saveCue: (payload) => call('saveCue', payload),
  saveDependency: (payload) => call('saveDependency', payload),
  previewChange: (payload) => call('previewChange', payload),
  publishRevision: (payload) => call('publishRevision', payload),
  getCoordinatorEvent: (eventId) => call('getCoordinatorEvent', { eventId }),
  inviteVendor: (payload) => call('inviteVendor', payload),
  acceptVendorInvitation: (payload) => call('acceptVendorInvitation', payload),
  getVendorSheet: (eventId) => call('getVendorSheet', { eventId }),
  acknowledgeRevision: (payload) => call('acknowledgeRevision', payload),
  retryNotificationJob: (payload) => call('retryNotificationJob', payload),
  updateVendorAssignments: (payload) => call('updateVendorAssignments', payload),
};
