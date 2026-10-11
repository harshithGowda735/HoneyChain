/**
 * Date Formatting Utilities
 * Safely handles Firestore Timestamp objects, ISO strings, Date objects, and numbers.
 */

export function formatDate(input, format = 'medium') {
  if (!input) return 'Recently';
  if (input === 'Pending' || input === 'Scheduled') return input;

  try {
    let date = null;

    // Handle Firestore Timestamp { seconds, nanoseconds } or objects with .toDate()
    if (typeof input === 'object') {
      if (typeof input.toDate === 'function') {
        date = input.toDate();
      } else if (typeof input.seconds === 'number') {
        date = new Date(input.seconds * 1000);
      } else if (input instanceof Date) {
        date = input;
      } else {
        return 'Recently';
      }
    } else if (typeof input === 'number') {
      date = new Date(input);
    } else if (typeof input === 'string') {
      date = new Date(input);
    }

    if (!date || isNaN(date.getTime())) {
      return typeof input === 'string' ? input : 'Recently';
    }

    if (format === 'short') {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    if (format === 'full') {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }

    // Default: 'Oct 06, 2026'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export function formatRelativeTime(input) {
  if (!input) return 'Just now';
  if (typeof input === 'object') {
    if (typeof input.toDate === 'function') {
      return input.toDate().toLocaleDateString('en-US');
    }
    if (typeof input.seconds === 'number') {
      return new Date(input.seconds * 1000).toLocaleDateString('en-US');
    }
    return 'Recently';
  }
  return String(input);
}

export default {
  formatDate,
  formatRelativeTime,
};
