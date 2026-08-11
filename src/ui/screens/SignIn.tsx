import { useState, type FormEvent } from 'react';
import { CircleAlert, FileStack, Layers, ShieldCheck } from 'lucide-react';
import { BRAND_BLUE, BRAND_BLUE_DEEP, SHORTHILLS_LOGO } from '../brand';
import { useStore } from '../../store';

/**
 * The front door.
 *
 * Two columns: the form, and a plain-English account of what the person is
 * about to sign in to. The second column is not decoration — most people who
 * open this are seeing a clinical QC tool for the first time, and the sign-in
 * screen is the only moment they have nothing else to read.
 */
export function SignIn() {
  const signIn = useStore((s) => s.signIn);
  const error = useStore((s) => s.signInError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    signIn(email, password);
  };

  return (
    <div className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="grid w-full max-w-[62rem] gap-px border bg-[var(--line)] rule md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ---------------------------------------------------------- */}
        {/* Form                                                       */}
        {/* ---------------------------------------------------------- */}
        <div className="bg-raised px-8 py-9">
          <img
            src={SHORTHILLS_LOGO}
            alt="Shorthills AI"
            className="h-8 w-auto"
            width={312}
            height={83}
          />

          <h1 className="mt-7 text-[19px] font-semibold leading-tight text-ink">
            Clinical Document QC
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
            Sign in to check a study’s documents against each other before they are submitted.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="label">Email</span>
              <input
                type="email"
                autoComplete="username"
                autoFocus
                className="field mt-1 w-full"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="label">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                className="field mt-1 w-full"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••"
              />
            </label>

            {touched && error && (
              <p
                role="alert"
                className="flex items-start gap-2 border px-3 py-2 text-[12px] leading-relaxed rule"
                style={{ color: 'var(--critical)', borderColor: 'var(--critical)' }}
              >
                <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2.5 text-[13px] font-medium text-white transition-colors"
              style={{ background: BRAND_BLUE }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = BRAND_BLUE_DEEP;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = BRAND_BLUE;
              }}
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 border-t pt-4 rule">
            <p className="text-[11px] leading-relaxed text-ink-faint">
              Access is by invitation. A production deployment authenticates against the sponsor’s
              single sign-on; nothing behind this screen depends on how the session was obtained.
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* What this is                                               */}
        {/* ---------------------------------------------------------- */}
        <div className="bg-sunken px-8 py-9">
          <div className="label">What you are signing in to</div>

          <p className="mt-3 text-[13px] leading-relaxed text-ink">
            A clinical trial is written up across several long documents that all have to tell the
            same story. When one is revised and another is not, the numbers stop matching — and the
            first person to notice is usually the regulator.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink">
            This reads those documents, pulls out every fact that ought to appear in more than one
            of them, and reports the places where they disagree — with the page and paragraph that
            proves it.
          </p>

          <ul className="mt-7 space-y-5">
            <Point
              icon={FileStack}
              title="Three documents, checked at once"
              body="The analysis plan, the results tables and the safety brochure are read in parallel, each in its own window."
            />
            <Point
              icon={Layers}
              title="Then checked against each other"
              body="The findings that matter most only exist between documents: a number in the plan that the tables do not agree with."
            />
            <Point
              icon={ShieldCheck}
              title="Nothing leaves this tab"
              body="Files are read in the browser. There is no upload, no server, and no network request after the page loads."
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function Point({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileStack;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <Icon size={16} aria-hidden className="mt-0.5 shrink-0" style={{ color: BRAND_BLUE }} />
      <div className="min-w-0">
        <div className="text-[12.5px] font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-[12px] leading-relaxed text-ink-muted">{body}</div>
      </div>
    </li>
  );
}
