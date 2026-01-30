import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getEnergyColor(energy: string): string {
  switch (energy.toLowerCase()) {
    case 'high':
      return 'text-red-400';
    case 'medium':
      return 'text-amber-400';
    case 'low':
      return 'text-[#00FF41]';
    default:
      return 'text-gray-400';
  }
}

export function getEnergyIcon(energy: string): string {
  switch (energy.toLowerCase()) {
    case 'high':
      return '⚡⚡⚡';
    case 'medium':
      return '⚡⚡';
    case 'low':
      return '⚡';
    default:
      return '•';
  }
}
