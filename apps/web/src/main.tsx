import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { create } from "zustand";
import {
  validateParty,
  type Account,
  type Hero,
  type HeroId,
} from "@loa/shared";
import { api, ApiError } from "./api";
import "./style.css";
const useSession = create<{
  account: Account | null;
  setAccount: (a: Account | null) => void;
}>((set) => ({ account: null, setAccount: (account) => set({ account }) }));
function App() {
  const { account, setAccount } = useSession();
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [heroes, setHeroes] = useState<Hero[]>([]),
    [draft, setDraft] = useState<HeroId[]>([]),
    [tab, setTab] = useState<"party" | "codex">("party");
  async function load() {
    const me = await api<{ account: Account }>("/auth/me");
    const data = await api<{ heroes: Hero[] }>("/heroes");
    setAccount(me.account);
    setDraft(me.account.party);
    setHeroes(data.heroes);
  }
  useEffect(() => {
    load()
      .catch((e) => {
        if (!(e instanceof ApiError && e.status === 401)) setError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
      if (e instanceof ApiError && e.status === 401) setAccount(null);
      if (e instanceof ApiError && e.status === 409 && account) {
        try {
          await load();
          setNotice("서버의 최신 편성을 불러왔습니다.");
        } catch {}
      }
    } finally {
      setBusy(false);
    }
  }
  function authenticate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    void act(async () => {
      const body = {
        email: f.get("email"),
        password: f.get("password"),
        ...(mode === "register" ? { nickname: f.get("nickname") } : {}),
        actionId: crypto.randomUUID(),
        revision: 0,
      };
      await api(`/auth/${mode}`, "POST", body);
      await load();
      setNotice("로비에 오신 것을 환영합니다.");
    });
  }
  const reductions = Object.fromEntries(
    heroes.map((h) => [h.id, h.costReduction]),
  );
  const invalid = validateParty(draft, reductions);
  const cost = draft.reduce(
    (n, id) => n + (heroes.find((h) => h.id === id)?.currentCost ?? 0),
    0,
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(account?.party);
  function toggle(id: HeroId) {
    if (busy) return;
    setNotice("");
    setDraft((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  }
  function move(index: number, delta: number) {
    setDraft((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  return (
    <>
      <div className="rotate-hint">
        ↻ 가로 화면에서 더 넓게 플레이할 수 있습니다.
      </div>
      <div className="app-shell">
        <header>
          <a className="brand" href="/" aria-label="LOA ROGUE 홈">
            <span className="brand-symbol">✧</span>
            <span>
              LOA <b>ROGUE</b>
              <small>THE ARK CHRONICLES</small>
            </span>
          </a>
          <span className="build-tag">개발 프리뷰 · PHASE 1</span>
          {account && (
            <div className="profile">
              <span>{account.nickname}</span>
              <button
                className="quiet"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await api("/auth/logout", "POST", {
                      actionId: crypto.randomUUID(),
                      revision: account.revision,
                    });
                    setAccount(null);
                    setHeroes([]);
                    setDraft([]);
                  })
                }
              >
                로그아웃
              </button>
            </div>
          )}
        </header>
        {loading ? (
          <main className="loading" role="status">
            로비를 불러오는 중…
          </main>
        ) : !account ? (
          <main className="entry">
            <section className="intro">
              <p className="eyebrow">A NEW JOURNEY AWAITS</p>
              <h1>
                균열 너머,
                <br />
                <em>당신의 원정대.</em>
              </h1>
              <p className="description">
                여섯 영웅과 함께 준비하는 새로운 여정.
                <br />
                영웅을 선택하고, 나만의 파티를 편성하세요.
              </p>
              <div className="ark-art" aria-hidden="true">
                <div className="orbit" />
                <div className="crystal">✦</div>
                <span>ARK / 001</span>
              </div>
              <div className="entry-facts">
                <span>
                  06 <small>초기 영웅</small>
                </span>
                <span>
                  15 <small>편성 코스트</small>
                </span>
                <span>
                  01 <small>개발 단계</small>
                </span>
              </div>
            </section>
            <section className="auth-panel">
              <p className="eyebrow">WELCOME, ADVENTURER</p>
              <h2>
                {mode === "login" ? "여정을 준비하세요" : "새 원정대 등록"}
              </h2>
              <p className="muted">계정과 편성을 서버에 안전하게 저장합니다.</p>
              <div className="auth-tabs">
                <button
                  className={mode === "login" ? "active" : ""}
                  disabled={busy}
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  로그인
                </button>
                <button
                  className={mode === "register" ? "active" : ""}
                  disabled={busy}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  회원가입
                </button>
              </div>
              <form onSubmit={authenticate}>
                <label>
                  이메일
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    maxLength={254}
                    placeholder="adventurer@example.com"
                    disabled={busy}
                  />
                </label>
                {mode === "register" && (
                  <label>
                    닉네임
                    <input
                      name="nickname"
                      autoComplete="nickname"
                      required
                      minLength={2}
                      maxLength={20}
                      placeholder="2~20자"
                      disabled={busy}
                    />
                  </label>
                )}
                <label>
                  비밀번호
                  <input
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "register" ? 10 : 1}
                    maxLength={128}
                    placeholder={
                      mode === "register" ? "10자 이상" : "비밀번호 입력"
                    }
                    disabled={busy}
                  />
                </label>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <button className="primary wide" disabled={busy}>
                  {busy
                    ? "처리 중…"
                    : mode === "login"
                      ? "로비 입장 →"
                      : "회원가입 →"}
                </button>
              </form>
              <p className="phase-note">
                현재는 계정·영웅 도감·파티 편성까지 이용 가능합니다.
                <br />
                던전과 전투는 다음 단계에서 추가됩니다.
              </p>
            </section>
          </main>
        ) : (
          <main className="lobby">
            <section className="lobby-heading">
              <div>
                <p className="eyebrow">EXPEDITION BASE CAMP</p>
                <h1>원정대 로비</h1>
                <p className="muted">
                  {account.nickname}님, 다음 여정을 위한 영웅을 준비하세요.
                </p>
              </div>
              <div className="currency">
                <span>✦</span>
                <div>
                  <small>아크의 결정</small>
                  <strong>{account.crystals.toLocaleString()}</strong>
                </div>
                <small>영구 성장 · Phase 6 예정</small>
              </div>
            </section>
            <nav className="lobby-nav" aria-label="로비 메뉴">
              <button
                className={tab === "party" ? "active" : ""}
                onClick={() => setTab("party")}
              >
                01 <span>파티 편성</span>
              </button>
              <button
                className={tab === "codex" ? "active" : ""}
                onClick={() => setTab("codex")}
              >
                02 <span>영웅 도감</span>
              </button>
              <span>서버 저장 · REV {account.revision}</span>
            </nav>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="success" role="status">
                {notice}
              </p>
            )}
            <div className="workspace">
              <section className="roster">
                <div className="section-heading">
                  <div>
                    <h2>
                      {tab === "party" ? "영웅을 선택하세요" : "여섯 명의 영웅"}
                    </h2>
                    <p className="muted">
                      {tab === "party"
                        ? "선택한 순서로 편성됩니다. 첫 번째 영웅이 선봉입니다."
                        : "기본 능력치 · 영구 강화는 아직 적용되지 않습니다."}
                    </p>
                  </div>
                  <span className="count">06 HEROES</span>
                </div>
                <div className="hero-grid">
                  {heroes.map((hero, i) => {
                    const selected = draft.includes(hero.id);
                    return (
                      <article
                        className={`hero-card ${selected && tab === "party" ? "selected" : ""}`}
                        key={hero.id}
                        style={
                          { "--hero-color": hero.color } as React.CSSProperties
                        }
                      >
                        <div className="hero-art" aria-hidden="true">
                          <span className="hero-no">0{i + 1}</span>
                          <div className="hero-emblem">
                            {["拳", "羽", "剣", "幻", "光", "盾"][i]}
                          </div>
                          <span className="hero-cost">
                            {hero.currentCost}
                            <small>COST</small>
                          </span>
                        </div>
                        <div className="hero-info">
                          <h3>{hero.name}</h3>
                          <p>{hero.role}</p>
                          <div className="stats">
                            <span>
                              HP <b>{hero.hp}</b>
                            </span>
                            <span>
                              ATK <b>{hero.attack}</b>
                            </span>
                            <span>
                              DEF <b>{hero.defense}</b>
                            </span>
                            <span>
                              SPD <b>{hero.speed}</b>
                            </span>
                          </div>
                          {tab === "party" ? (
                            <button
                              aria-pressed={selected}
                              disabled={busy}
                              onClick={() => toggle(hero.id)}
                            >
                              {selected
                                ? `✓ ${draft.indexOf(hero.id) + 1}번 슬롯 · 해제`
                                : "+ 파티에 추가"}
                            </button>
                          ) : (
                            <p className="codex-note">
                              기본 코스트 {hero.cost} · 최소 {hero.minCost}
                              <br />
                              스킬·3D 모델은 후속 단계 예정
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
              <aside className="party-panel">
                <p className="eyebrow">YOUR EXPEDITION</p>
                <h2>{tab === "party" ? "시작 파티" : "현재 편성"}</h2>
                <div className={`cost-meter ${cost > 15 ? "over" : ""}`}>
                  <span>편성 코스트</span>
                  <strong>
                    {cost}
                    <small> / 15</small>
                  </strong>
                </div>
                <div className="meter">
                  <div
                    style={{
                      width: `${Math.min(100, (cost / 15) * 100)}%`,
                      background: cost > 15 ? "#f18b8b" : undefined,
                    }}
                  />
                </div>
                <p className="muted">최대 6명 · 중복 편성 불가</p>
                <ol className="party-slots">
                  {draft.map((id, i) => {
                    const h = heroes.find((h) => h.id === id)!;
                    return (
                      <li key={id}>
                        <span className="slot-no">{i + 1}</span>
                        <div>
                          <strong>{h.name}</strong>
                          <small>
                            {i === 0 ? "선봉" : "대기"} · 코스트 {h.currentCost}
                          </small>
                        </div>
                        {tab === "party" && (
                          <div className="slot-actions">
                            <button
                              aria-label={`${h.name} 앞으로`}
                              disabled={busy || i === 0}
                              onClick={() => move(i, -1)}
                            >
                              ↑
                            </button>
                            <button
                              aria-label={`${h.name} 뒤로`}
                              disabled={busy || i === draft.length - 1}
                              onClick={() => move(i, 1)}
                            >
                              ↓
                            </button>
                            <button
                              aria-label={`${h.name} 제거`}
                              disabled={busy}
                              onClick={() => toggle(id)}
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                  {draft.length === 0 && (
                    <li className="empty-slot">영웅 카드를 눌러 편성하세요.</li>
                  )}
                </ol>
                {tab === "party" && (
                  <>
                    <p
                      className={
                        invalid ? "validation error" : "validation muted"
                      }
                      role="status"
                    >
                      {invalid ??
                        (dirty
                          ? "변경사항을 저장하세요."
                          : "현재 편성이 저장되어 있습니다.")}
                    </p>
                    <button
                      className="primary wide"
                      disabled={busy || !!invalid || !dirty}
                      onClick={() =>
                        void act(async () => {
                          const result = await api<{ account: Account }>(
                            "/party",
                            "PUT",
                            {
                              heroIds: draft,
                              revision: account.revision,
                              actionId: crypto.randomUUID(),
                            },
                          );
                          setAccount(result.account);
                          setDraft(result.account.party);
                          setNotice("파티 편성을 서버에 저장했습니다.");
                        })
                      }
                    >
                      {busy ? "저장 중…" : "파티 저장"}
                    </button>
                    <button
                      className="quiet wide"
                      disabled={busy || !dirty}
                      onClick={() => {
                        setDraft(account.party);
                        setError("");
                      }}
                    >
                      변경 취소
                    </button>
                  </>
                )}
                <div className="next-phase">
                  <span>다음 업데이트</span>
                  <strong>균열의 첫 번째 전투</strong>
                  <p>도전 시작 · 전투는 Phase 2부터 구현됩니다.</p>
                </div>
              </aside>
            </div>
          </main>
        )}
        <footer>
          <span>
            LOA ROGUE <span className="footer-dot">·</span> 자체 제작 UI / 원작
            에셋 미사용
          </span>
          <span>PHASE 1 — ACCOUNT & PARTY</span>
        </footer>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
