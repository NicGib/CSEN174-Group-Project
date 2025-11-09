// Navigation stack to track previous routes
// Uses a simple in-memory stack for navigation history

type RouteStack = string[];

// In-memory stack for navigation history
const navigationStack: RouteStack = [];

/**
 * Push a route onto the navigation stack
 */
export function pushRoute(route: string): void {
  navigationStack.push(route);
  console.log('Navigation stack pushed:', route, 'Stack:', navigationStack);
}

/**
 * Pop a route from the navigation stack
 * Returns the previous route or null if stack is empty
 */
export function popRoute(): string | null {
  const route = navigationStack.pop() || null;
  console.log('Navigation stack popped:', route, 'Stack:', navigationStack);
  return route;
}

/**
 * Peek at the top route without removing it
 */
export function peekRoute(): string | null {
  return navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
}

/**
 * Clear the navigation stack
 */
export function clearStack(): void {
  navigationStack.length = 0;
  console.log('Navigation stack cleared');
}

/**
 * Get the current stack (for debugging)
 */
export function getStack(): string[] {
  return [...navigationStack];
}

