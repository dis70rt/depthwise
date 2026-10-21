import { useEffect, useRef, useState } from "react";

/** A small, repeatable demonstration of the real focus-before-expand flow. */
export function LandingTree() {
  const host = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    if (host.current) observer.observe(host.current);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <figure className="landing-tree" ref={host}>
      <div
        className="landing-tree-viewport"
        data-paused={!visible || !pageVisible}
      >
        <svg
          className="landing-tree-scene"
          viewBox="0 0 720 480"
          role="img"
          aria-labelledby="landing-tree-title landing-tree-description"
        >
          <title id="landing-tree-title">
            Explore a question, then its follow-ups
          </title>
          <desc id="landing-tree-description">
            A database question branches into three questions. The view moves to
            the index question, opens its Markdown preview, reveals two deeper
            questions. It then follows the B-tree question, opens its preview
            and reveals another level, then returns to the original tree and
            repeats.
          </desc>
          <g className="demo-camera">
            <g className="demo-overview-branches">
              <path
                className="demo-connection"
                d="M256 260 C313 260 313 275 370 275"
              />
              <path
                className="demo-connection"
                d="M256 260 C313 260 313 425 370 425"
              />
            </g>
            <path
              className="demo-connection demo-route"
              d="M256 260 C313 260 313 125 370 125"
            />
            <g className="demo-root">
              <rect
                className="demo-node-surface"
                x="20"
                y="220"
                width="236"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="38" y="252">
                <tspan x="38">What makes a</tspan>
                <tspan x="38" dy="27">
                  database query fast?
                </tspan>
              </text>
            </g>
            <g className="demo-other-questions">
              <rect
                className="demo-node-surface"
                x="370"
                y="235"
                width="300"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="390" y="268">
                <tspan x="390">Where does the query</tspan>
                <tspan x="390" dy="27">
                  planner start?
                </tspan>
              </text>
              <rect
                className="demo-node-surface"
                x="370"
                y="385"
                width="300"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="390" y="418">
                <tspan x="390">What are the trade-offs?</tspan>
              </text>
            </g>
            <g className="demo-deeper-branches">
              <path
                className="demo-connection demo-new-connection demo-second-route"
                pathLength="1"
                d="M670 194 C705 194 705 155 740 155"
              />
              <g className="demo-second-sibling">
                <path
                  className="demo-connection demo-new-connection"
                  pathLength="1"
                  d="M670 194 C705 194 705 340 740 340"
                />
              </g>
            </g>
            <g className="demo-deeper-questions">
              <g className="demo-second-question">
                <rect
                  className="demo-node-surface demo-second-surface"
                  x="740"
                  y="115"
                  width="280"
                  height="80"
                  rx="14"
                />
                <text className="demo-question" x="760" y="148">
                  <tspan x="760">What does a B-tree</tspan>
                  <tspan x="760" dy="27">
                    keep in order?
                  </tspan>
                </text>
                <g className="demo-disclosure demo-second-disclosure">
                  <path d="M991 146l6 6-6 6" />
                </g>
                <g className="demo-second-markdown">
                  <text className="demo-filepath" x="760" y="205">
                    b-tree.md
                  </text>
                  <text className="demo-section" x="760" y="240">
                    Explore
                  </text>
                  <text className="demo-body" x="760" y="271">
                    How are keys kept in order?
                  </text>
                  <text className="demo-body" x="760" y="303">
                    When does a node split?
                  </text>
                </g>
              </g>
              <g className="demo-second-sibling">
                <rect
                  className="demo-node-surface"
                  x="740"
                  y="300"
                  width="280"
                  height="80"
                  rx="14"
                />
                <text className="demo-question" x="760" y="333">
                  <tspan x="760">When is a table scan</tspan>
                  <tspan x="760" dy="27">
                    the better choice?
                  </tspan>
                </text>
              </g>
            </g>
            <g className="demo-final-branches">
              <path
                className="demo-connection demo-final-connection"
                pathLength="1"
                d="M1020 224 C1055 224 1055 125 1090 125"
              />
              <path
                className="demo-connection demo-final-connection"
                pathLength="1"
                d="M1020 224 C1055 224 1055 315 1090 315"
              />
            </g>
            <g className="demo-final-questions">
              <rect
                className="demo-node-surface"
                x="1090"
                y="85"
                width="280"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="1110" y="118">
                <tspan x="1110">Why keep leaves at</tspan>
                <tspan x="1110" dy="27">
                  the same depth?
                </tspan>
              </text>
              <rect
                className="demo-node-surface"
                x="1090"
                y="275"
                width="280"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="1110" y="308">
                <tspan x="1110">When should a node</tspan>
                <tspan x="1110" dy="27">
                  split into two?
                </tspan>
              </text>
            </g>
            <g className="demo-selected-question">
              <rect
                className="demo-node-surface demo-selected-surface"
                x="370"
                y="85"
                width="300"
                height="80"
                rx="14"
              />
              <text className="demo-question" x="390" y="117">
                <tspan x="390">How does an index</tspan>
                <tspan x="390" dy="27">
                  speed up a lookup?
                </tspan>
              </text>
              <g className="demo-disclosure">
                <path d="M641 116l6 6-6 6" />
              </g>
              <g className="demo-markdown">
                <text className="demo-filepath" x="390" y="175">
                  indexes.md
                </text>
                <text className="demo-section" x="390" y="210">
                  Explore
                </text>
                <text className="demo-body" x="390" y="241">
                  What does the index store?
                </text>
                <text className="demo-body" x="390" y="273">
                  What work can it avoid?
                </text>
              </g>
            </g>
          </g>
        </svg>
      </div>
      <figcaption>Open a question. Reveal what comes next.</figcaption>
    </figure>
  );
}
