// Self-aware auth gate: no-ops entirely when AUTH_ENABLED is false.
// Astro inlines `__AUTH_ENABLED__` as a compile-time constant via vite.define
// (see astro.config.mjs), so this becomes a literal `true` or `false` in the
// final bundle — no runtime env access needed in the browser.

declare const __AUTH_ENABLED__: boolean;

const AUTH_ENABLED: boolean = typeof __AUTH_ENABLED__ !== "undefined" ? __AUTH_ENABLED__ : false;

if (AUTH_ENABLED) {
  // Async IIFE so we can use dynamic import() (static imports must be top-level).
  void (async () => {
    const SuperTokens = (await import("supertokens-web-js")).default;
    const Session = (await import("supertokens-web-js/recipe/session")).default;
    const EmailPassword = (await import("supertokens-web-js/recipe/emailpassword")).default;

    const apiDomain =
      (import.meta as ImportMeta & { env: Record<string, string> }).env
        .PUBLIC_API_DOMAIN || window.location.origin;

    let ready = false;

    function initAuth() {
      if (ready) return;
      SuperTokens.init({
        appInfo: {
          appName: "Belgium420",
          apiDomain,
          apiBasePath: "/auth",
        },
        recipeList: [EmailPassword.init(), Session.init()],
      });
      ready = true;
    }

    function $(id: string) {
      return document.getElementById(id);
    }

    function setAuthError(message: string) {
      const el = $("authError");
      if (!el) return;
      el.textContent = message;
      el.hidden = !message;
    }

    function showAuthGate(show: boolean) {
      const gate = $("authGate");
      if (!gate) return;
      gate.classList.toggle("hidden", !show);
      document.body.classList.toggle("auth-locked", show);
    }

    function showAgeGate(show: boolean) {
      const gate = $("ageGate");
      if (!gate) return;
      gate.classList.toggle("hidden", !show);
    }

    function setAuthMode(mode: "signin" | "signup") {
      const form = $("authForm") as HTMLFormElement | null;
      const title = $("authTitle");
      const submit = $("authSubmit") as HTMLButtonElement | null;
      const inviteWrap = $("inviteField");
      const toggle = $("authToggle");
      if (!form || !title || !submit || !inviteWrap || !toggle) return;

      form.dataset.mode = mode;
      if (mode === "signup") {
        title.textContent = "Create F&F access";
        submit.textContent = "Create account";
        inviteWrap.hidden = false;
        toggle.innerHTML =
          'Already have access? <button type="button" class="auth-link" data-auth-mode="signin">Sign in</button>';
      } else {
        title.textContent = "Friends & family access";
        submit.textContent = "Enter shop";
        inviteWrap.hidden = true;
        toggle.innerHTML =
          'Need an account? <button type="button" class="auth-link" data-auth-mode="signup">Sign up with invite</button>';
      }
      setAuthError("");
    }

    function unlockStripeStep() {
      const challenge = $("authChallenge");
      const formWrap = $("authFormWrap");
      if (challenge) challenge.hidden = true;
      if (formWrap) formWrap.hidden = false;
    }

    function setupStripeChallenge() {
      const expected = ["black", "yellow", "red"];
      let progress = 0;
      const status = $("challengeStatus");
      const buttons = document.querySelectorAll<HTMLButtonElement>("[data-stripe]");

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const color = btn.dataset.stripe;
          if (color !== expected[progress]) {
            progress = 0;
            buttons.forEach((b) => b.classList.remove("is-hit"));
            if (status) {
              status.textContent = "Wrong order — tap black → yellow → red";
            }
            return;
          }
          btn.classList.add("is-hit");
          progress += 1;
          if (status) {
            status.textContent =
              progress === expected.length
                ? "Unlocked"
                : `Good — ${expected.length - progress} left`;
          }
          if (progress === expected.length) {
            sessionStorage.setItem("b420StripeOk", "true");
            unlockStripeStep();
          }
        });
      });

      if (sessionStorage.getItem("b420StripeOk") === "true") {
        unlockStripeStep();
      }
    }

    async function refreshSessionUI() {
      initAuth();
      const loggedIn = await Session.doesSessionExist();
      const logoutBtn = $("logoutBtn");
      if (logoutBtn) logoutBtn.hidden = !loggedIn;
      return loggedIn;
    }

    async function gateSite() {
      const ageOk = sessionStorage.getItem("ageVerified") === "true";
      if (!ageOk) {
        showAgeGate(true);
        showAuthGate(false);
        return;
      }
      showAgeGate(false);

      try {
        const loggedIn = await refreshSessionUI();
        showAuthGate(!loggedIn);
      } catch (err) {
        console.error(err);
        showAuthGate(true);
        setAuthError(
          "Auth service unreachable. Start the Belgium420 auth server (npm run auth).",
        );
      }
    }

    async function onAuthSubmit(event: Event) {
      event.preventDefault();
      initAuth();
      setAuthError("");

      const form = event.target as HTMLFormElement;
      const mode = form.dataset.mode || "signin";
      const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
      const password = (form.elements.namedItem("password") as HTMLInputElement)
        .value;
      const invite = (form.elements.namedItem("invite") as HTMLInputElement)?.value
        ?.trim();

      const submit = $("authSubmit") as HTMLButtonElement | null;
      if (submit) submit.disabled = true;

      try {
        if (mode === "signup") {
          const response = await EmailPassword.signUp({
            formFields: [
              { id: "email", value: email },
              { id: "password", value: password },
              { id: "invite", value: invite || "" },
            ],
          });
          if (response.status === "FIELD_ERROR") {
            setAuthError(
              response.formFields.map((f: { error?: string }) => f.error).filter(Boolean).join(" · ") ||
                "Check the form fields",
            );
            return;
          }
          if (response.status !== "OK") {
            setAuthError("Could not create account");
            return;
          }
        } else {
          const response = await EmailPassword.signIn({
            formFields: [
              { id: "email", value: email },
              { id: "password", value: password },
            ],
          });
          if (response.status === "WRONG_CREDENTIALS_ERROR") {
            setAuthError("Wrong email or password");
            return;
          }
          if (response.status === "FIELD_ERROR") {
            setAuthError(
              response.formFields.map((f: { error?: string }) => f.error).filter(Boolean).join(" · ") ||
                "Check the form fields",
            );
            return;
          }
          if (response.status !== "OK") {
            setAuthError("Could not sign in");
            return;
          }
        }
        showAuthGate(false);
        await refreshSessionUI();
      } catch (err) {
        console.error(err);
        setAuthError("Auth request failed — is the API running?");
      } finally {
        if (submit) submit.disabled = false;
      }
    }

    function wireAgeGate() {
      const yes = document.querySelector(".age-btn-yes");
      const no = document.querySelector(".age-btn-no");
      yes?.addEventListener("click", () => {
        sessionStorage.setItem("ageVerified", "true");
        showAgeGate(false);
        void gateSite();
      });
      no?.addEventListener("click", () => {
        window.location.href = "https://www.google.com";
      });
    }

    function wireAuthChrome() {
      $("authForm")?.addEventListener("submit", onAuthSubmit);
      document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement | null;
        const modeBtn = target?.closest<HTMLElement>("[data-auth-mode]");
        if (modeBtn?.dataset.authMode === "signin" || modeBtn?.dataset.authMode === "signup") {
          setAuthMode(modeBtn.dataset.authMode);
        }
      });
      $("logoutBtn")?.addEventListener("click", async () => {
        initAuth();
        await Session.signOut();
        showAuthGate(true);
        await refreshSessionUI();
      });
    }

    wireAgeGate();
    wireAuthChrome();
    setupStripeChallenge();
    setAuthMode("signin");
    void gateSite();
  })();
}


