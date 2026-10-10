/**
 * backend/modules/site-content/application-rules.ts
 *
 * Required fields and length limits for the /partnerships/apply form, shared
 * by the form (checked as each step is left) and the server (checked again on
 * submit). Keeping one list means the server never rejects something the form
 * let through, so applicants are never sent back to an earlier step.
 *
 * Plain module: safe to import from client components.
 */

type Input = Record<string, unknown>;

export const APPLICATION_LIMITS = {
  name: 80,
  email: 200,
  text: 3000,
} as const;

export const APPLICATION_STEP_COUNT = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const value = (input: Input, key: string) => {
  const raw = input[key];
  return typeof raw === 'string' ? raw.trim() : '';
};

/**
 * Problems with the fields on one step, keyed by field name. Steps 4–6 are
 * entirely optional. Only fields shown on that step are checked.
 */
export function validateApplicationStep(step: number, input: Input): Record<string, string> {
  const errors: Record<string, string> = {};
  const require = (key: string, message: string) => {
    if (!value(input, key)) errors[key] = message;
  };
  const limit = (key: string, max: number, label: string) => {
    if (!errors[key] && value(input, key).length > max) errors[key] = `${label} must be at most ${max} characters.`;
  };

  if (step === 1) {
    require('firstName', 'Enter your first name.');
    require('lastName', 'Enter your last name.');
    require('email', 'Enter your email address.');
    if (!errors.email && !EMAIL_PATTERN.test(value(input, 'email'))) errors.email = 'Enter a valid email address, like name@company.com.';
    require('role', 'Choose the option that best describes your role.');
    if (value(input, 'role') === 'Other') require('otherRole', 'Tell us your role.');
    limit('firstName', APPLICATION_LIMITS.name, 'First name');
    limit('lastName', APPLICATION_LIMITS.name, 'Last name');
    limit('email', APPLICATION_LIMITS.email, 'Email');
  } else if (step === 2) {
    require('orgName', 'Enter your organization name.');
    require('orgType', 'Choose your organization type.');
    require('industry', 'Choose your industry or sector.');
  } else if (step === 3) {
    require('projectDescription', 'Tell us briefly what you want to build, improve, or solve.');
  }
  return errors;
}

/** The first step with a problem, or null when the whole application is valid. */
export function firstInvalidApplicationStep(input: Input): { step: number; errors: Record<string, string> } | null {
  for (let step = 1; step <= APPLICATION_STEP_COUNT; step++) {
    const errors = validateApplicationStep(step, input);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}
