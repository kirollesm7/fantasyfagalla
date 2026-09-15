import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useApp } from '../context/AppContext';
import { sbGetAccountTeams, sbGetMatches } from '../lib/db';
import { calcTeamPointsBreakdown } from '../lib/scoring';
import { useRankInfo } from '../hooks/useRankInfo';
import { BrandGlyph } from '../components/Brand';
import FantasyBrandHeader from '../components/FantasyBrandHeader';
import StandingsPage from './StandingsPage';
import './FantasyEnhancements.css';

const STARTERS = 4;
const BENCH = 3;
const SQUAD_SIZE = STARTERS + BENCH;
const STARTING_BUDGET = 100;
const MAX_FREE_TRANSFERS = 5;
const TRANSFER_HIT_POINTS = 4;

const CSS = `
.team-final-page,
.team-final-page * {
  box-sizing: border-box;
}

.team-final-page {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 14px 14px 110px;
  color: #39023f;
  background: #f7f5f8;
  direction: ltr;
  font-family: inherit;
}

.tf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.tf-header h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 900;
  color: #420348;
}

.tf-header-kicker {
  color: #8d7991;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tf-status {
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.tf-status.open {
  color: #08351e;
  background: #00ff87;
}

.tf-status.locked {
  color: white;
  background: #420348;
}

.tf-deadline {
  text-align: center;
  color: #6f5774;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 14px;
}

.tf-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.tf-stat {
  min-width: 0;
  padding: 11px 8px;
  text-align: center;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(66,3,72,.07);
}

.tf-stat span {
  display: block;
  color: #927c96;
  font-size: 9px;
}

.tf-stat strong {
  display: block;
  margin-top: 4px;
  color: #420348;
  font-size: 18px;
  font-weight: 900;
}

.tf-stat.budget strong {
  color: #04773d;
}

.tf-stat.danger strong {
  color: #e90052;
}

.tf-transfer-note {
  max-width: 690px;
  margin: -2px auto 12px;
  padding: 9px 12px;
  border-radius: 12px;
  text-align: center;
  color: #6e5572;
  background: #fff;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 3px 12px rgba(66,3,72,.05);
}

.tf-transfer-note strong {
  color: #420348;
}

.tf-alert {
  direction: rtl;
  text-align: right;
  margin-bottom: 12px;
  padding: 11px 13px;
  border-radius: 12px;
  color: #8c163d;
  background: #fff0f4;
  font-size: 12px;
  line-height: 1.6;
}

.tf-pitch {
  position: relative;
  width: 100%;
  max-width: 690px;
  height: 505px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 20px;
  background:
    repeating-linear-gradient(
      90deg,
      #08a548 0,
      #08a548 110px,
      #079940 110px,
      #079940 220px
    );
  box-shadow: 0 12px 34px rgba(8,92,49,.22);
}

.tf-pitch::before {
  content: "";
  position: absolute;
  inset: 12px;
  border: 2px solid rgba(255,255,255,.88);
  border-radius: 3px;
  pointer-events: none;
}

.tf-half-line {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 55%;
  height: 2px;
  background: rgba(255,255,255,.88);
}

.tf-circle {
  position: absolute;
  left: 50%;
  top: 55%;
  width: 92px;
  height: 92px;
  border: 2px solid rgba(255,255,255,.88);
  border-radius: 50%;
  transform: translate(-50%,-50%);
}

.tf-box {
  position: absolute;
  left: 50%;
  width: 190px;
  height: 65px;
  border: 2px solid rgba(255,255,255,.88);
  transform: translateX(-50%);
}

.tf-box.top {
  top: 12px;
  border-top: 0;
}

.tf-box.bottom {
  bottom: 12px;
  border-bottom: 0;
}

.tf-pitch-content {
  position: relative;
  z-index: 2;
  height: 100%;
  padding: 28px 10px 16px;
  display: flex;
  flex-direction: column;
}

.tf-row {
  display: flex;
  justify-content: center;
  gap: 22px;
}

.tf-row.row2 {
  margin-top: 44px;
}

.tf-bench-title {
  margin: auto 0 7px;
  text-align: center;
  color: rgba(255,255,255,.9);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.tf-bench {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.tf-player {
  position: relative;
  overflow: visible;
  width: 112px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.tf-player.bench {
  width: 96px;
}

.tf-price {
  width: max-content;
  max-width: 100%;
  margin: 0 auto 4px;
  padding: 3px 8px;
  border-radius: 999px;
  color: white;
  background: rgba(34,48,43,.72);
  font-size: 10px;
  font-weight: 900;
}

.tf-shirt {
  position: relative;
  width: 70px;
  height: 72px;
  margin: 0 auto;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px 15px 7px 7px;
  background: linear-gradient(180deg,#fff,#e7e7ea);
  box-shadow: 0 7px 18px rgba(0,0,0,.16);
}

.tf-player.bench .tf-shirt {
  width: 60px;
  height: 62px;
}

.tf-bench-order {
  position: absolute;
  z-index: 9;
  top: 24px;
  left: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255,255,255,.95);
  border-radius: 50%;
  color: #fff;
  background: #37003c;
  box-shadow: 0 3px 10px rgba(0,0,0,.22);
  font-size: 10px;
  font-weight: 900;
}

.tf-bench-help {
  margin: 5px 0 0;
  text-align: center;
  color: rgba(255,255,255,.92);
  font-size: 8px;
  font-weight: 800;
}

.tf-shirt img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tf-shirt-placeholder {
  width: 46px;
  height: 48px;
  clip-path: polygon(21% 4%,38% 0,50% 13%,62% 0,79% 4%,100% 23%,84% 39%,78% 31%,78% 100%,22% 100%,22% 31%,16% 39%,0 23%);
  background: var(--shirt-color, #4b5ee9);
  box-shadow: inset 0 -14px 22px rgba(0,0,0,.08);
}

.tf-empty .tf-shirt {
  color: #420348;
  background: #d7ffe9;
  font-size: 30px;
  font-weight: 900;
}

.tf-cap {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  background: #420348;
  font-size: 9px;
  font-weight: 900;
}

.tf-name {
  position: relative;
  z-index: 6;
  width: 100%;
  min-height: 24px;
  margin-top: 5px;
  padding: 5px 5px 4px;
  display: flex !important;
  align-items: center;
  justify-content: center;
  overflow: visible !important;
  white-space: normal !important;
  word-break: break-word;
  line-height: 1.15;
  border-radius: 8px 8px 0 0;
  color: #420348 !important;
  background: #fff !important;
  box-shadow: 0 3px 10px rgba(0,0,0,.12);
  opacity: 1 !important;
  visibility: visible !important;
  font-size: 10px;
  font-weight: 900;
}

.tf-team {
  padding: 0 5px 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 0 0 8px 8px;
  color: #76627a;
  background: #fff;
  font-size: 8px;
  font-weight: 700;
}

.tf-empty .tf-name {
  border-radius: 8px;
}

.tf-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  max-width: 690px;
  margin: 12px auto 0;
}

.tf-main-btn,
.tf-ghost-btn {
  min-height: 49px;
  border-radius: 999px;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.tf-main-btn {
  border: 0;
  color: white;
  background: #420348;
}

.tf-ghost-btn {
  border: 2px solid #e4dae6;
  color: #78637d;
  background: #fff;
}


.tf-chips {
  max-width: 690px;
  margin: 12px auto 0;
  padding: 12px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 3px 12px rgba(66,3,72,.07);
}

.tf-chips-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}

.tf-chips-head h3 {
  margin: 0;
  color: #420348;
  font-size: 14px;
  font-weight: 900;
}

.tf-chips-head span {
  color: #947f98;
  font-size: 9px;
  font-weight: 800;
}

.tf-chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.tf-chip-btn {
  min-height: 58px;
  padding: 8px 6px;
  border: 1px solid #e9e0ea;
  border-radius: 13px;
  background: #faf8fb;
  color: #4b2850;
  font: inherit;
  cursor: pointer;
}

.tf-chip-btn strong {
  display: block;
  font-size: 11px;
  font-weight: 900;
}

.tf-chip-btn small {
  display: block;
  margin-top: 3px;
  color: #907a94;
  font-size: 8px;
  line-height: 1.3;
}

.tf-chip-btn.active {
  color: #fff;
  border-color: #420348;
  background: linear-gradient(135deg,#420348,#7b1684);
}

.tf-chip-btn.active small {
  color: rgba(255,255,255,.78);
}

.tf-chip-btn.used,
.tf-chip-btn:disabled {
  opacity: .55;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .tf-chips {
    margin-left: 12px;
    margin-right: 12px;
  }

  .tf-chip-grid {
    grid-template-columns: 1fr 1fr;
  }
}


.tf-usage {
  width: max-content;
  max-width: 100%;
  margin: 4px auto 0;
  padding: 3px 7px;
  border-radius: 999px;
  color: #0d6d42;
  background: #e8fff3;
  font-size: 8px;
  font-weight: 900;
}

.tf-change-player-btn {
  width: calc(100% - 28px);
  min-height: 46px;
  margin: 14px;
  border: 0;
  border-radius: 14px;
  color: white;
  background: linear-gradient(135deg,#420348,#7b1684);
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 7px 18px rgba(66,3,72,.18);
}

.tf-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: rgba(18,4,21,.58);
  backdrop-filter: blur(4px);
}

.tf-sheet {
  width: min(650px,100%);
  max-height: 88vh;
  overflow: hidden;
  border-radius: 24px 24px 16px 16px;
  background: white;
  color: #2d1731;
  box-shadow: 0 20px 48px rgba(0,0,0,.24);
}

.tf-sheet.scroll {
  overflow-y: auto;
}

.tf-sheet-head {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #eee7ef;
  background: #fff;
}

.tf-sheet-head h2,
.tf-sheet-head h3 {
  margin: 0;
  color: #420348;
}

.tf-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  color: #420348;
  background: #f2edf3;
  font-size: 23px;
  cursor: pointer;
}

.tf-search {
  width: calc(100% - 28px);
  height: 45px;
  margin: 12px 14px 4px;
  padding: 0 13px;
  border: 1px solid #e4dce6;
  border-radius: 13px;
  outline: none;
  font: inherit;
}

.tf-picker-list {
  max-height: 65vh;
  overflow-y: auto;
  padding: 8px 14px 14px;
}

.tf-picker-player {
  width: 100%;
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid #eee7ef;
  border-radius: 14px;
  background: white;
  text-align: left;
  cursor: pointer;
}

.tf-picker-shirt {
  width: 48px;
  height: 48px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f3eff4;
}

.tf-picker-shirt img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tf-picker-info strong {
  display: block;
  color: #3b1940;
  font-size: 13px;
}

.tf-picker-info small {
  display: block;
  margin-top: 2px;
  color: #88738c;
  font-size: 10px;
}

.tf-picker-meta {
  text-align: right;
}

.tf-picker-meta b {
  display: block;
  color: #420348;
  font-size: 12px;
}

.tf-picker-meta small {
  color: #0b8648;
  font-size: 9px;
}

.tf-details-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px;
  color: white;
  background: linear-gradient(125deg,#37003c,#670071);
}

.tf-details-shirt {
  width: 92px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tf-details-shirt img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.tf-details-shirt .tf-shirt-placeholder {
  width: 70px;
  height: 78px;
}

.tf-details-hero h2 {
  margin: 0;
  font-size: 24px;
}

.tf-details-hero p {
  margin: 4px 0 0;
  opacity: .8;
  font-size: 12px;
}

.tf-details-stats {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  border-bottom: 1px solid #eee7ef;
}

.tf-details-stat {
  padding: 13px 6px;
  text-align: center;
  border-right: 1px solid #eee7ef;
}

.tf-details-stat:last-child {
  border-right: 0;
}

.tf-details-stat span {
  display: block;
  color: #95829a;
  font-size: 9px;
}

.tf-details-stat strong {
  display: block;
  margin-top: 3px;
  color: #420348;
  font-size: 18px;
}

.tf-section {
  padding: 16px;
  border-bottom: 1px solid #eee7ef;
}

.tf-section h3 {
  margin: 0 0 11px;
  color: #420348;
  font-size: 14px;
}

.tf-gw-row {
  display: grid;
  grid-template-columns: 44px 1fr 48px;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.tf-gw-row span,
.tf-gw-row strong {
  font-size: 10px;
}

.tf-gw-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #ede7ef;
}

.tf-gw-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg,#00ff87,#08b9ff);
}

.tf-fixture {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
  gap: 9px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 12px;
  background: #f7f3f8;
}

.tf-fixture-gw {
  color: #8d7891;
  font-size: 9px;
  font-weight: 900;
}

.tf-fixture strong {
  display: block;
  color: #420348;
  font-size: 12px;
}

.tf-fixture small {
  display: block;
  margin-top: 2px;
  color: #8c7a90;
  font-size: 9px;
}

.tf-fixture-date {
  color: #795f7e;
  font-size: 9px;
  text-align: right;
}

.tf-detail-actions {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 8px;
  padding: 14px;
}

.tf-detail-actions button {
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  color: white;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
}

.tf-captain-btn { background: #7724ff; }
.tf-replace-btn { background: #420348; }
.tf-remove-btn { background: #e90052; }

.tf-empty-text {
  padding: 14px;
  text-align: center;
  color: #8c7a90;
  background: #f7f3f8;
  border-radius: 12px;
  font-size: 11px;
}

@media (max-width: 600px) {
  .team-final-page {
    padding: 10px 0 100px;
  }

  .tf-header,
  .tf-deadline,
  .tf-stats,
  .tf-alert,
  .tf-actions,
  .tf-transfer-note {
    margin-left: 12px;
    margin-right: 12px;
  }

  .tf-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .tf-pitch {
    width: 100%;
    height: 455px;
    border-radius: 0;
  }

  .tf-row {
    gap: 8px;
  }

  .tf-row.row2 {
    margin-top: 37px;
  }

  .tf-player {
    width: 94px;
  }

  .tf-player.bench {
    width: 87px;
  }

  .tf-shirt {
    width: 60px;
    height: 62px;
  }

  .tf-player.bench .tf-shirt {
    width: 54px;
    height: 56px;
  }

  .tf-name {
    min-height: 23px;
    font-size: 9.5px;
  }

  .tf-bench-order {
    top: 22px;
    left: 5px;
    width: 22px;
    height: 22px;
    font-size: 9px;
  }

  .tf-team {
    font-size: 7.5px;
  }

  .tf-details-hero {
    padding: 15px;
  }

  .tf-details-shirt {
    width: 78px;
    height: 86px;
  }
}
`;


const MAJOR_CSS = `
.team-final-page {
  max-width: 1180px;
  padding-top: 18px;
  background: #f6f6f8;
}

.tf-deadline {
  margin: 0 14px 12px;
  padding: 11px 14px;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(115deg, #37003c, #5f0069);
  font-size: 12px;
  font-weight: 900;
}

.tf-stats { max-width: 1040px; margin: 0 auto 12px; }
.tf-transfer-note { max-width: 1040px; }
.tf-alert { max-width: 1040px; margin-left: auto; margin-right: auto; }
.tf-pitch { max-width: 900px; height: 610px; }
.tf-pitch-content { padding-top: 42px; }
.tf-row { gap: 56px; }
.tf-row.row2 { margin-top: 72px; }
.tf-player { width: 142px; }
.tf-player.bench { width: 125px; }
.tf-shirt { width: 82px; height: 86px; }
.tf-player.bench .tf-shirt { width: 72px; height: 75px; }
.tf-name { font-size: 11px; min-height: 28px; }
.tf-team { font-size: 9px; }
.tf-actions { max-width: 900px; }

.tf-chips {
  max-width: 900px;
  margin-top: 18px;
  padding: 0;
  overflow: hidden;
  border: 1px solid #e8e2e9;
  border-radius: 14px;
  box-shadow: none;
}
.tf-chips-head {
  margin: 0;
  padding: 14px 16px;
  color: #fff;
  background: #37003c;
}
.tf-chips-head h3 { color: #fff; font-size: 16px; }
.tf-chips-head span { color: rgba(255,255,255,.72); }
.tf-chip-grid {
  grid-template-columns: repeat(2, 1fr);
  gap: 0;
}
.tf-chip-card {
  min-height: 118px;
  padding: 16px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 14px;
  border: 0;
  border-right: 1px solid #ece6ed;
  border-bottom: 1px solid #ece6ed;
  background: #fff;
}
.tf-chip-card:nth-child(even) { border-right: 0; }
.tf-chip-copy strong { display:block; color:#37003c; font-size:15px; font-weight:900; }
.tf-chip-copy small { display:block; margin-top:5px; color:#756478; font-size:10px; line-height:1.45; }
.tf-chip-action {
  min-width: 92px;
  height: 38px;
  border: 0;
  border-radius: 999px;
  color: #37003c;
  background: #00ff87;
  font: inherit;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}
.tf-chip-card.active { background: #f0fff7; box-shadow: inset 4px 0 0 #00ff87; }
.tf-chip-card.active .tf-chip-action { color:#fff; background:#e90052; }
.tf-chip-card.used { opacity:.56; }
.tf-chip-card.used .tf-chip-action { background:#ece7ed; color:#756478; cursor:not-allowed; }

/* Full-page transfer / player views */
.fpl-major-page,
.fpl-major-page * { box-sizing:border-box; }
.fpl-major-page {
  min-height: 100vh;
  width:100%;
  padding: 18px 18px 90px;
  color:#242424;
  background:#f4f4f6;
  direction:ltr;
  font-family:inherit;
}
.fpl-major-inner { width:min(1220px, 100%); margin:0 auto; }
.fpl-major-backbar {
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:14px;
}
.fpl-back-btn {
  height:40px;
  padding:0 16px;
  border:0;
  border-radius:999px;
  color:#37003c;
  background:#fff;
  font:inherit;
  font-size:11px;
  font-weight:900;
  cursor:pointer;
  box-shadow:0 2px 8px rgba(0,0,0,.07);
}
.fpl-major-gw { color:#7e6b82; font-size:11px; font-weight:900; }
.fpl-major-hero {
  overflow:hidden;
  border-radius:18px;
  color:#fff;
  background:
    radial-gradient(circle at 85% 10%, rgba(0,255,135,.35), transparent 28%),
    linear-gradient(120deg,#37003c,#62006d);
  box-shadow:0 12px 30px rgba(55,0,60,.18);
}
.fpl-major-hero-main { padding:24px 24px 20px; }
.fpl-major-eyebrow { opacity:.7; font-size:10px; font-weight:900; letter-spacing:1px; text-transform:uppercase; }
.fpl-major-hero h1 { margin:4px 0 0; font-size:34px; line-height:1; font-weight:950; }
.fpl-major-hero p { margin:8px 0 0; max-width:760px; opacity:.82; font-size:11px; line-height:1.55; }
.fpl-major-summary {
  display:grid;
  grid-template-columns:repeat(4,1fr);
  background:rgba(0,0,0,.16);
}
.fpl-major-summary > div { padding:14px; text-align:center; border-right:1px solid rgba(255,255,255,.13); }
.fpl-major-summary > div:last-child { border-right:0; }
.fpl-major-summary span { display:block; opacity:.68; font-size:9px; font-weight:800; }
.fpl-major-summary strong { display:block; margin-top:3px; font-size:19px; font-weight:950; }

.fpl-filter-panel {
  margin-top:14px;
  padding:14px;
  display:grid;
  grid-template-columns:minmax(220px,1.6fr) repeat(3,minmax(130px,.6fr));
  gap:10px;
  border:1px solid #e5e1e6;
  border-radius:14px;
  background:#fff;
}
.fpl-filter-panel input,
.fpl-filter-panel select {
  width:100%; height:44px; padding:0 12px;
  border:1px solid #ddd7df; border-radius:8px; outline:none;
  color:#3c2e3f; background:#fff; font:inherit; font-size:11px; font-weight:750;
}
.fpl-filter-panel input:focus,
.fpl-filter-panel select:focus { border-color:#00a85a; box-shadow:0 0 0 2px rgba(0,255,135,.18); }

.fpl-list-shell {
  margin-top:14px;
  overflow:hidden;
  border:1px solid #dfd9e1;
  border-radius:14px;
  background:#fff;
}
.fpl-list-title {
  padding:13px 16px;
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  color:#fff; background:#37003c;
}
.fpl-list-title strong { font-size:14px; }
.fpl-list-title span { opacity:.72; font-size:9px; }
.fpl-table-wrap { overflow:auto; }
.fpl-player-table { width:100%; min-width:1120px; border-collapse:collapse; }
.fpl-player-table th {
  position:sticky; top:0; z-index:1;
  padding:9px 8px; text-align:center;
  color:#6e5d72; background:#f4f1f5;
  border-bottom:1px solid #ddd7df;
  font-size:8px; text-transform:uppercase; letter-spacing:.4px;
}
.fpl-player-table th:first-child { text-align:left; padding-left:14px; }
.fpl-player-table td { padding:9px 8px; text-align:center; border-bottom:1px solid #f0edf1; font-size:10px; font-weight:750; }
.fpl-player-table tr:last-child td { border-bottom:0; }
.fpl-player-table tbody tr { cursor:pointer; transition:background .12s ease; }
.fpl-player-table tbody tr:hover { background:#f3fff8; }
.fpl-player-table tbody tr.current { background:#fff8e8; }
.fpl-player-cell { display:flex; align-items:center; gap:10px; min-width:245px; text-align:left; }
.fpl-mini-shirt { width:42px; height:44px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.fpl-mini-shirt img { width:100%; height:100%; object-fit:contain; }
.fpl-player-ident strong { display:block; color:#37003c; font-size:12px; font-weight:950; }
.fpl-player-ident small { display:block; margin-top:2px; color:#7c6d80; font-size:9px; }
.fpl-current-tag { display:inline-block; margin-left:5px; padding:2px 5px; border-radius:4px; color:#6b5200; background:#ffe9a8; font-size:7px; font-weight:900; }
.fpl-select-btn {
  min-width:72px; height:32px; border:0; border-radius:999px;
  color:#37003c; background:#00ff87; font:inherit; font-size:9px; font-weight:950; cursor:pointer;
}
.fpl-info-btn {
  min-width:58px; height:32px; border:1px solid #d8d0da; border-radius:999px;
  color:#37003c; background:#fff; font:inherit; font-size:9px; font-weight:900; cursor:pointer;
}
.fpl-points-col { color:#37003c; font-size:13px !important; font-weight:950 !important; }
.fpl-green { color:#087a45; }
.fpl-red { color:#d90c4f; }

.fpl-player-hero { margin-top:0; display:grid; grid-template-columns:180px 1fr; align-items:end; min-height:245px; }
.fpl-player-visual { height:220px; padding:18px 14px 0 24px; display:flex; align-items:flex-end; justify-content:center; }
.fpl-player-visual img { max-width:100%; max-height:100%; object-fit:contain; }
.fpl-player-visual .tf-shirt-placeholder { width:118px; height:132px; margin-bottom:24px; }
.fpl-player-headcopy { padding:26px 24px 28px 0; }
.fpl-player-headcopy h1 { font-size:38px; }
.fpl-player-headcopy .fpl-player-sub { margin-top:8px; font-size:12px; opacity:.8; }
.fpl-player-actions { margin-top:14px; display:flex; flex-wrap:wrap; gap:9px; }
.fpl-player-actions button { min-height:40px; padding:0 16px; border:0; border-radius:999px; font:inherit; font-size:10px; font-weight:950; cursor:pointer; }
.fpl-primary { color:#37003c; background:#00ff87; }
.fpl-secondary { color:#fff; background:rgba(255,255,255,.18); border:1px solid rgba(255,255,255,.25)!important; }
.fpl-danger { color:#fff; background:#e90052; }

.fpl-stat-grid { margin-top:14px; display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
.fpl-stat-card { min-height:82px; padding:12px 8px; text-align:center; border:1px solid #e4dfe5; border-radius:10px; background:#fff; }
.fpl-stat-card span { display:block; color:#7f7083; font-size:8px; text-transform:uppercase; font-weight:850; }
.fpl-stat-card strong { display:block; margin-top:5px; color:#37003c; font-size:20px; font-weight:950; }

.fpl-two-col { margin-top:14px; display:grid; grid-template-columns:1.35fr .65fr; gap:14px; align-items:start; }
.fpl-card { overflow:hidden; border:1px solid #e1dce3; border-radius:12px; background:#fff; }
.fpl-card-head { padding:12px 14px; color:#fff; background:#37003c; font-size:12px; font-weight:950; }
.fpl-gw-detail-table { width:100%; border-collapse:collapse; min-width:900px; }
.fpl-gw-detail-table th { padding:8px; color:#706174; background:#f4f1f5; font-size:7px; text-transform:uppercase; }
.fpl-gw-detail-table td { padding:8px; text-align:center; border-top:1px solid #f0edf1; font-size:9px; }
.fpl-fixture-list { padding:10px; }
.fpl-fixture-item { display:grid; grid-template-columns:40px 1fr auto; gap:8px; align-items:center; padding:10px 4px; border-bottom:1px solid #efebf0; }
.fpl-fixture-item:last-child { border-bottom:0; }
.fpl-fixture-item b { color:#37003c; font-size:11px; }
.fpl-fixture-item small { color:#837486; font-size:8px; }

@media (max-width: 760px) {
  .team-final-page { padding-left:0; padding-right:0; }
  .tf-stats, .tf-transfer-note, .tf-alert { margin-left:12px; margin-right:12px; }
  .tf-pitch { height:500px; }
  .tf-row { gap:10px; }
  .tf-row.row2 { margin-top:42px; }
  .tf-player { width:96px; }
  .tf-player.bench { width:89px; }
  .tf-shirt { width:61px; height:64px; }
  .tf-player.bench .tf-shirt { width:55px; height:58px; }
  .tf-name { font-size:9.5px; }
  .tf-chip-grid { grid-template-columns:1fr; }
  .tf-chip-card { border-right:0; }
  .fpl-major-page { padding:10px 0 80px; }
  .fpl-major-backbar, .fpl-major-hero, .fpl-filter-panel, .fpl-list-shell, .fpl-stat-grid, .fpl-two-col { margin-left:10px; margin-right:10px; }
  .fpl-major-hero { border-radius:12px; }
  .fpl-major-hero-main { padding:20px 16px 16px; }
  .fpl-major-hero h1 { font-size:27px; }
  .fpl-major-summary { grid-template-columns:1fr 1fr; }
  .fpl-major-summary > div:nth-child(2) { border-right:0; }
  .fpl-major-summary > div:nth-child(-n+2) { border-bottom:1px solid rgba(255,255,255,.13); }
  .fpl-filter-panel { grid-template-columns:1fr 1fr; }
  .fpl-filter-panel input { grid-column:1/-1; }
  .fpl-player-hero { grid-template-columns:105px 1fr; min-height:205px; }
  .fpl-player-visual { height:175px; padding:12px 4px 0 12px; }
  .fpl-player-headcopy { padding:20px 12px 20px 0; }
  .fpl-player-headcopy h1 { font-size:28px; }
  .fpl-stat-grid { grid-template-columns:repeat(3,1fr); }
  .fpl-two-col { grid-template-columns:1fr; }
}
`;

const FPL_FULLSCREEN_CSS = `
/* Fullscreen team experience: the outer app shell is hidden by App.jsx only on My Team. */
.team-experience-wrap {
  width: 100% !important;
  max-width: none !important;
  min-height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
}
.team-experience-body {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
}
.team-experience-body > * { max-width: none !important; }

.team-final-page,
.fpl-major-page {
  max-width: none;
  min-height: 100vh;
  padding: 0 0 118px !important;
  background: #f6f6f8;
}
.team-final-page > *,
.fpl-major-inner { width: min(1180px, calc(100% - 28px)); margin-left: auto; margin-right: auto; }

.fpl-local-tabs {
  width: 100% !important;
  max-width: none !important;
  margin: 0 0 20px !important;
  padding: 0 14px;
  background:
    radial-gradient(circle at 78% -20%, rgba(0,255,135,.35), transparent 34%),
    linear-gradient(110deg, #37003c 0%, #4c0056 56%, #26002b 100%);
  box-shadow: 0 6px 18px rgba(55,0,60,.18);
}
.fpl-local-tabs-inner {
  width: min(1180px, 100%);
  min-height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.fpl-local-tabs button {
  position: relative;
  min-height: 58px;
  padding: 0 24px 4px;
  border: 0;
  color: rgba(255,255,255,.76);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}
.fpl-local-tabs button::after {
  content: '';
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 0;
  height: 4px;
  border-radius: 5px 5px 0 0;
  background: transparent;
}
.fpl-local-tabs button.active { color: #fff; }
.fpl-local-tabs button.active::after { background: #00ff87; }
.fpl-local-tabs button.league-link { margin-left: auto; color: #00ff87; }

.fpl-screen-heading {
  margin-top: 0;
  margin-bottom: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  border-radius: 14px;
  color: #fff;
  background:
    radial-gradient(circle at 88% 10%, rgba(0,255,135,.32), transparent 30%),
    linear-gradient(112deg, #37003c, #5b0066 68%, #2a002f);
  overflow: hidden;
}
.fpl-screen-heading span {
  display:block;
  opacity:.72;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .9px;
}
.fpl-screen-heading h1 {
  margin: 2px 0 0;
  font-size: 36px;
  line-height: 1;
  font-weight: 950;
}
.fpl-screen-heading p {
  max-width: 720px;
  margin: 7px 0 0;
  opacity: .8;
  font-size: 11px;
  line-height: 1.45;
}
.fpl-screen-heading > strong {
  flex: 0 0 auto;
  padding: 9px 13px;
  border-radius: 999px;
  color: #37003c;
  background: #00ff87;
  font-size: 12px;
  font-weight: 950;
}


.tf-gw-points {
  width: max-content;
  max-width: 100%;
  margin: 3px auto 0;
  padding: 3px 7px;
  border-radius: 999px;
  color: #37003c;
  background: #00ff87;
  font-size: 8px;
  font-weight: 950;
  line-height: 1.1;
}

.fpl-transfer-screen .fpl-major-inner,
.fpl-player-screen .fpl-major-inner { width: min(1180px, calc(100% - 28px)); }
.fpl-transfer-hero { margin-top: 0; border-radius: 14px; box-shadow: none; }
.fpl-transfer-hero .fpl-major-summary { background: linear-gradient(90deg,#37003c,#5a0064); }

.fpl-transfer-squad-card {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid #ddd7df;
  border-radius: 14px;
  background: #fff;
}
.fpl-transfer-squad-head {
  padding: 13px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e8e2e9;
}
.fpl-transfer-squad-head span { display:block; color:#847587; font-size:8px; font-weight:900; letter-spacing:.7px; }
.fpl-transfer-squad-head strong { display:block; margin-top:2px; color:#37003c; font-size:14px; font-weight:950; }
.fpl-transfer-squad-head small { color:#8a7a8d; font-size:9px; font-weight:800; }
.fpl-transfer-squad-pitch {
  position: relative;
  padding: 22px 18px 18px;
  background:
    linear-gradient(rgba(255,255,255,.17),rgba(255,255,255,.17)),
    repeating-linear-gradient(90deg,#04a65b 0,#04a65b 110px,#049a54 110px,#049a54 220px);
}
.fpl-transfer-squad-pitch::before {
  content:'';
  position:absolute;
  inset:10px;
  border:1px solid rgba(255,255,255,.75);
  pointer-events:none;
}
.fpl-transfer-starters,
.fpl-transfer-bench-row {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.fpl-transfer-bench-row { grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 760px; margin:0 auto; }
.fpl-transfer-bench-label {
  position:relative;
  z-index:1;
  width:max-content;
  margin:22px auto 10px;
  padding:4px 9px;
  border-radius:999px;
  color:#37003c;
  background:rgba(255,255,255,.9);
  font-size:8px;
  font-weight:950;
  letter-spacing:.6px;
}
.fpl-transfer-squad-player {
  position: relative;
  min-width: 0;
  min-height: 122px;
  padding: 8px 8px 10px;
  border: 2px solid transparent;
  border-radius: 9px;
  color: #37003c;
  background: rgba(255,255,255,.95);
  font: inherit;
  cursor: pointer;
  box-shadow: 0 5px 13px rgba(15,66,40,.14);
}
.fpl-transfer-squad-player.selected {
  border-color:#e90052;
  box-shadow:0 0 0 3px rgba(233,0,82,.18), 0 5px 13px rgba(15,66,40,.14);
}
.fpl-transfer-squad-player:disabled { opacity:.65; cursor:not-allowed; }
.fpl-transfer-shirt { display:flex; width:58px; height:58px; margin:0 auto 4px; align-items:center; justify-content:center; }
.fpl-transfer-shirt img { width:100%; height:100%; object-fit:contain; }
.fpl-transfer-squad-player strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10px; font-weight:950; }
.fpl-transfer-squad-player small { display:block; margin-top:2px; color:#786a7b; font-size:8px; font-weight:850; }
.fpl-transfer-squad-player em {
  position:absolute; top:6px; right:6px; padding:3px 6px; border-radius:999px;
  color:#fff; background:#e90052; font-size:7px; font-style:normal; font-weight:950;
}
.fpl-transfer-squad-player.empty { border-style:dashed; background:rgba(255,255,255,.88); }
.fpl-transfer-empty-plus { display:grid; place-items:center; width:48px; height:48px; margin:5px auto 9px; border-radius:50%; color:#37003c; background:#00ff87; font-size:26px; font-weight:500; }
.fpl-transfer-bench-order {
  position:absolute; top:6px; left:6px; width:20px; height:20px; display:grid; place-items:center;
  border-radius:50%; color:#37003c; background:#00ff87; font-size:8px; font-weight:950;
}

.fpl-transfer-instruction {
  margin-top: 12px;
  padding: 12px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  border:1px solid #e0d9e2;
  border-left:5px solid #37003c;
  border-radius:10px;
  background:#fff;
}
.fpl-transfer-instruction.ready { border-left-color:#00b864; background:#f4fff9; }
.fpl-transfer-instruction span { display:block; color:#8a7b8d; font-size:8px; font-weight:900; }
.fpl-transfer-instruction strong { display:block; margin-top:2px; color:#37003c; font-size:12px; font-weight:950; }
.fpl-transfer-instruction small { display:block; margin-top:2px; color:#7c6c80; font-size:9px; }
.fpl-transfer-instruction button { height:34px; padding:0 12px; border:0; border-radius:999px; color:#fff; background:#37003c; font:inherit; font-size:9px; font-weight:900; cursor:pointer; }

.fpl-filter-panel-advanced {
  grid-template-columns:minmax(210px,1.45fr) repeat(2,minmax(120px,.65fr)) repeat(2,minmax(115px,.55fr)) minmax(150px,.75fr);
}
.fpl-price-filter { min-width:0; }
.fpl-price-filter label { display:block; margin:0 0 4px; color:#78697b; font-size:8px; font-weight:900; text-transform:uppercase; }
.fpl-price-filter > div { height:44px; display:flex; align-items:center; border:1px solid #ddd7df; border-radius:8px; overflow:hidden; background:#fff; }
.fpl-price-filter > div > span { padding-left:10px; color:#37003c; font-size:11px; font-weight:900; }
.fpl-price-filter input { height:42px !important; border:0 !important; box-shadow:none !important; padding-left:5px !important; }
.fpl-player-table tbody tr.unaffordable { opacity:.52; }
.fpl-select-btn:disabled { background:#e5e0e6; color:#8d7e90; cursor:not-allowed; }

.fpl-gw-focus-card {
  margin-top:14px;
  overflow:hidden;
  border:1px solid #e1dce3;
  border-radius:12px;
  background:#fff;
}
.fpl-gw-focus-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.fpl-gw-focus-head span { display:block; opacity:.68; font-size:7px; font-weight:850; letter-spacing:.5px; }
.fpl-gw-focus-head strong { display:block; margin-top:2px; font-size:12px; }
.fpl-gw-focus-head select { min-width:110px; height:34px; padding:0 10px; border:0; border-radius:7px; color:#37003c; background:#00ff87; font:inherit; font-size:9px; font-weight:950; }
.fpl-gw-focus-grid { padding:12px; display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
.fpl-gw-detail-table tbody tr { cursor:pointer; }
.fpl-gw-detail-table tbody tr.selected-gw-row { background:#effff7; box-shadow:inset 4px 0 0 #00c76c; }

.tf-chips.compact .tf-chip-card { min-height:92px; }
.tf-chips.compact .tf-chip-copy small { font-size:9px; }

@media (max-width: 900px) {
  .fpl-filter-panel-advanced { grid-template-columns:1fr 1fr 1fr; }
  .fpl-filter-panel-advanced > input:first-child { grid-column:1 / -1; }
  .fpl-transfer-starters { gap:7px; }
  .fpl-gw-focus-grid { grid-template-columns:repeat(4,1fr); }
}


.fpl-local-tabs {
  position: sticky;
  top: 0;
  z-index: 900;
  padding: 0 !important;
  margin: 0 0 16px !important;
  background: #37003c !important;
  box-shadow: 0 5px 16px rgba(55,0,60,.22) !important;
}
.fpl-local-tabs-brand {
  width: min(1180px, calc(100% - 28px));
  height: 66px;
  margin: 0 auto;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
  font-size: 16px;
  font-weight: 850;
  letter-spacing: .5px;
}
.fpl-local-tabs-brand strong {
  color: #00ff87;
  font-size: 20px;
  font-weight: 950;
}
.fpl-local-tabs-inner {
  width: 100% !important;
  max-width: 1180px;
  min-height: 54px !important;
  margin: 0 auto;
  display: grid !important;
  grid-template-columns: repeat(2, minmax(0,1fr));
  align-items: end !important;
  gap: 0 !important;
  background: rgba(0,0,0,.08);
}
.fpl-local-tabs button {
  width: 100%;
  min-height: 54px !important;
  padding: 0 16px 5px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e6cce8 !important;
  font-size: 14px !important;
  font-weight: 950 !important;
}
.fpl-local-tabs button.active { color: #fff !important; }
.fpl-local-tabs button::after {
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 3px !important;
}
.fpl-local-tabs button.active::after { background: #00ff87 !important; }

@media (max-width: 620px) {
  .fpl-local-tabs { margin-bottom: 12px !important; }
  .fpl-local-tabs-brand { width: 100%; height: 64px; padding: 0 22px; }
  .fpl-local-tabs-brand span { font-size: 14px; }
  .fpl-local-tabs-brand strong { font-size: 19px; }
  .fpl-local-tabs-inner { width: 100% !important; min-height: 55px !important; }
  .fpl-local-tabs button { min-height: 55px !important; font-size: 13px !important; }
  .team-final-page > *,
  .fpl-transfer-screen .fpl-major-inner,
  .fpl-player-screen .fpl-major-inner { width:calc(100% - 16px); }
  .fpl-local-tabs { padding:0 4px; margin-bottom:10px !important; }
  .fpl-local-tabs-inner { min-height:58px; }
  .fpl-local-tabs button { min-height:50px; padding:0 12px 4px; font-size:11px; }
  .fpl-local-tabs button::after { left:9px; right:9px; }
  .fpl-screen-heading { padding:16px 14px; border-radius:10px; }
  .fpl-screen-heading h1 { font-size:28px; }
  .fpl-screen-heading p { font-size:9px; }
  .fpl-screen-heading > strong { font-size:10px; padding:7px 9px; }
  .fpl-transfer-starters { grid-template-columns:repeat(2,1fr); }
  .fpl-transfer-bench-row { grid-template-columns:repeat(3,1fr); gap:6px; }
  .fpl-transfer-squad-player { min-height:110px; padding-left:4px; padding-right:4px; }
  .fpl-transfer-shirt { width:48px; height:48px; }
  .fpl-filter-panel-advanced { grid-template-columns:1fr 1fr; }
  .fpl-filter-panel-advanced > input:first-child { grid-column:1/-1; }
  .fpl-filter-panel-advanced select:last-child { grid-column:1/-1; }
  .fpl-gw-focus-grid { grid-template-columns:repeat(3,1fr); }
  .fpl-transfer-instruction { align-items:flex-start; }
  .fpl-transfer-instruction button { flex:0 0 auto; }
}
`;

let teamPageSportState = { sport: 'football', onSwitch: null };

function FplLocalTabs({ active, onHome, onPickTeam, onTransfers, onStandings }) {
  void onPickTeam;
  void onTransfers;
  void onStandings;
  return (
    <>
      <FantasyBrandHeader sport={teamPageSportState.sport} onSwitchSport={teamPageSportState.onSwitch} />
      {active !== 'home' && <div className="fpl-home-back-row"><button type="button" className="fpl-home-back" onClick={onHome}>← Fantasy Home</button></div>}
    </>
  );
}

export default function TeamPage({ onOpenStandings, sport, onSwitchSport }) {
  teamPageSportState = { sport: sport || 'football', onSwitch: onSwitchSport || null };
  const app = useApp();

  const {
    user,
    players = [],
    stats = {},
    gwState = { gw: 1, locked: false },
    team,
    points = {},
    users = [],
  } = app;

  const [draftTeam, setDraftTeam] = useState(() =>
    syncTeamForGameweek(
      normalizeTeam(team),
      Number(gwState.gw) || 1
    )
  );

  const [matches, setMatches] = useState([]);
  const [accountTeams, setAccountTeams] = useState([]);
  const [picker, setPicker] = useState(null);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('home');
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [viewGw, setViewGw] = useState(Number(gwState.gw) || 1);
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState(null);
  const [homeInfo, setHomeInfo] = useState({ loading: true, error: '', rank: null, total: 0, gwPoints: 0, average: 0, highest: 0 });
  const loadRankInfo = useRankInfo({ user, users, players, stats, gwState, team });

  useEffect(() => {
    const normalized = normalizeTeam(team);
    const synced = syncTeamForGameweek(
      normalized,
      Number(gwState.gw) || 1
    );

    setDraftTeam(synced);

    // Persist automatic GW rollover (banked free transfers + Free Hit restore).
    // This runs only when the saved team is genuinely behind the current GW.
    if (
      team &&
      transferRelevantSignature(normalized) !==
        transferRelevantSignature(synced)
    ) {
      saveTeamThroughContext(app, synced).catch((error) => {
        console.error('Automatic transfer rollover save failed:', error);
      });
    }
  }, [team, gwState.gw]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await sbGetMatches();

        if (alive) {
          setMatches(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          'Loading matches failed:',
          error
        );
      }
    })();

    return () => {
      alive = false;
    };
  }, []);


  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await sbGetAccountTeams();

        if (alive) {
          setAccountTeams(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          'Loading team ownership failed:',
          error
        );

        // Fallback: if AppContext already exposes complete user/team objects,
        // use them instead of crashing the whole page.
        if (alive) {
          const fallback = Array.isArray(users)
            ? users
                .map((entry) => {
                  if (
                    entry &&
                    typeof entry === 'object' &&
                    entry.team
                  ) {
                    return {
                      username:
                        entry.username ??
                        entry.name ??
                        entry.id ??
                        '',
                      team: entry.team,
                    };
                  }

                  return null;
                })
                .filter(Boolean)
            : [];

          setAccountTeams(fallback);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [users]);

  function switchSection(nextSection) {
    if (section === 'transfers' && nextSection !== 'transfers' && pendingTransfers.length) {
      const leave = window.confirm('Discard your unconfirmed transfer changes?');
      if (!leave) return;
      setDraftTeam(syncTeamForGameweek(normalizeTeam(team), Number(gwState.gw) || 1));
      setPendingTransfers([]);
    }
    setSection(nextSection);
    setPicker(null);
    setDetails(null);
    setSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const selectedIds = useMemo(
    () =>
      [
        ...draftTeam.starters,
        ...draftTeam.bench,
      ].filter(Boolean),
    [draftTeam]
  );

  const selectedIdSet = useMemo(
    () =>
      new Set(
        selectedIds.map(String)
      ),
    [selectedIds]
  );

  const spent = useMemo(
    () =>
      selectedIds.reduce(
        (total, id) => {
          const player =
            getPlayerById(
              players,
              id
            );

          return (
            total +
            getPlayerPrice(player)
          );
        },
        0
      ),
    [selectedIds, players]
  );

  const bank =
    Math.max(
      0,
      STARTING_BUDGET - spent
    );

  const pickedCount =
    selectedIds.length;

  const isComplete =
    pickedCount === SQUAD_SIZE;

  const transferState = getTransferState(
    draftTeam,
    Number(gwState.gw) || 1
  );

  const gameweekOptions = useMemo(() => {
    const values = new Set([Number(gwState.gw) || 1]);
    Object.keys(stats || {}).forEach((key) => {
      const match = key.match(/^gw(\d+)$/);
      if (match) values.add(Number(match[1]));
    });
    Object.keys(points || {}).forEach((key) => {
      const match = key.match(/^gw(\d+)$/);
      if (match) values.add(Number(match[1]));
    });
    return [...values].sort((a, b) => a - b);
  }, [gwState.gw, points, stats]);
  const viewingHistorical = Number(viewGw) !== Number(gwState.gw);
  const historicalSnapshot = draftTeam.transferState?.history?.[String(viewGw)]?.squad;
  const visibleTeam = historicalSnapshot
    ? normalizeTeam({ ...draftTeam, ...historicalSnapshot })
    : draftTeam;
  const gwBreakdown = calcTeamPointsBreakdown(players, stats, visibleTeam, Number(viewGw));
  const finalizedTotal = Object.values(points || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const overallPoints = finalizedTotal + (points[`gw${gwState.gw}`] === undefined && !viewingHistorical
    ? calcTeamPointsBreakdown(players, stats, draftTeam, Number(gwState.gw)).total
    : 0);

  const wildcardActive =
    Number(draftTeam.wildcards?.wildcard) === Number(gwState.gw);
  const freeHitActive =
    Number(draftTeam.wildcards?.freeHit) === Number(gwState.gw);
  const unlimitedTransfers = wildcardActive || freeHitActive;

  const ownershipMap = useMemo(
    () =>
      buildOwnershipMap(
        players,
        accountTeams
      ),
    [players, accountTeams]
  );

  useEffect(() => {
    if (!['home', 'points'].includes(section) || !team) return;
    let alive = true;
    setHomeInfo((current) => ({ ...current, loading: true, error: '' }));
    loadRankInfo().then((rankData) => {
      if (!alive) return;
      const gw = Number(gwState.gw) || 1;
      const gwRows = users.map((username) => {
        const saved = rankData.allPoints?.[username]?.[`gw${gw}`];
        return saved !== undefined
          ? Number(saved) || 0
          : calcTeamPointsBreakdown(players, stats, rankData.allTeams?.[username], gw).total;
      });
      setHomeInfo({
        loading: false,
        error: '',
        rank: rankData.overallRank,
        total: rankData.totalPts,
        gwPoints: rankData.breakdown.find((entry) => Number(entry.gw) === gw)?.pts || 0,
        average: gwRows.length ? Math.round(gwRows.reduce((sum, value) => sum + value, 0) / gwRows.length) : 0,
        highest: gwRows.length ? Math.max(...gwRows) : 0,
      });
    }).catch((error) => {
      console.error('fantasy home rank load failed', error);
      if (alive) setHomeInfo((current) => ({ ...current, loading: false, error: 'Rank data could not be loaded.' }));
    });
    return () => { alive = false; };
  }, [gwState.gw, loadRankInfo, players, section, stats, team, users]);

  async function persistTeam(
    nextTeam
  ) {
    const previous = draftTeam;
    setDraftTeam(nextTeam);

    try {
      await saveTeamThroughContext(app, nextTeam);
      updateLocalOwnershipTeam(setAccountTeams, user, nextTeam);
    } catch (error) {
      console.error(
        'Team save failed:',
        error
      );

      setDraftTeam(previous);

      window.alert(
        'التشكيلة ماتحفظتش. رجعت للشكل القديم.'
      );

      throw error;
    }
  }

  async function choosePlayer(
    player
  ) {
    if (!picker) return;
    if (player?.locked) {
      window.alert('This player is currently unavailable for selection.');
      return;
    }

    const next =
      normalizeTeam(draftTeam);

    const price =
      getPlayerPrice(player);

    const currentId =
      picker.currentId;

    const currentPlayer =
      getPlayerById(
        players,
        currentId
      );

    const oldPrice =
      getPlayerPrice(
        currentPlayer
      );

    const projectedSpent =
      spent - oldPrice + price;

    if (
      projectedSpent >
      STARTING_BUDGET
    ) {
      window.alert(
        `اللاعب ده هيخليك تتخطى ميزانية ${STARTING_BUDGET}M`
      );
      return;
    }

    next.starters =
      next.starters.map(
        (id) =>
          String(id) ===
          String(player.id)
            ? null
            : id
      );

    next.bench =
      next.bench.map(
        (id) =>
          String(id) ===
          String(player.id)
            ? null
            : id
      );

    if (
      picker.group ===
      'starter'
    ) {
      next.starters[
        picker.index
      ] = player.id;
    } else {
      next.bench[
        picker.index
      ] = player.id;
    }

    if (
      next.captainId &&
      !next.starters.some(
        (id) =>
          String(id) ===
          String(next.captainId)
      )
    ) {
      next.captainId =
        null;
    }
    if (next.viceCaptainId && !next.starters.some((id) => String(id) === String(next.viceCaptainId))) {
      next.viceCaptainId = null;
    }

    const replacingExistingPlayer =
      Boolean(currentId) &&
      String(currentId) !== String(player.id) &&
      isComplete;

    if (replacingExistingPlayer) {
      const charged = applyTransferToTeam(
        next,
        Number(gwState.gw) || 1
      );

      next.transferState = charged.transferState;
    }
    setDraftTeam(next);
    setPendingTransfers((current) => [...current, {
      outId: currentId || null,
      inId: player.id,
      group: picker.group,
      index: picker.index,
    }]);
    setPicker(null);
  }

  async function confirmTransfers() {
    if (!pendingTransfers.length || gwState.locked) return;
    await persistTeam(draftTeam);
    setPendingTransfers([]);
  }

  function cancelTransfers() {
    setDraftTeam(syncTeamForGameweek(normalizeTeam(team), Number(gwState.gw) || 1));
    setPendingTransfers([]);
    setPicker(null);
  }

  async function makeCaptain() {
    if (
      gwState.locked ||
      !details?.player ||
      details.group !==
        'starter'
    ) {
      return;
    }

    await persistTeam({
      ...draftTeam,
      captainId:
        details.player.id,
      viceCaptainId: String(draftTeam.viceCaptainId) === String(details.player.id) ? draftTeam.captainId : draftTeam.viceCaptainId,
    });

    setDetails(null);
  }

  async function makeViceCaptain() {
    if (gwState.locked || !details?.player || details.group !== 'starter') return;
    await persistTeam({
      ...draftTeam,
      viceCaptainId: details.player.id,
      captainId: String(draftTeam.captainId) === String(details.player.id) ? draftTeam.viceCaptainId : draftTeam.captainId,
    });
    setDetails(null);
  }

  async function performSwap(sourceGroup, sourceIndex, targetGroup, targetIndex) {
    if (gwState.locked) return;
    const next = normalizeTeam(draftTeam);
    const sourceList = sourceGroup === 'starter' ? next.starters : next.bench;
    const targetList = targetGroup === 'starter' ? next.starters : next.bench;
    const sourceId = sourceList[sourceIndex];
    sourceList[sourceIndex] = targetList[targetIndex];
    targetList[targetIndex] = sourceId;
    if (!next.starters.some((id) => String(id) === String(next.captainId))) next.captainId = null;
    if (!next.starters.some((id) => String(id) === String(next.viceCaptainId))) next.viceCaptainId = null;
    await persistTeam(next);
  }

  async function swapPick(targetGroup, targetIndex) {
    if (gwState.locked || !details?.player) return;
    await performSwap(details.group, details.index, targetGroup, targetIndex);
    setDetails(null);
  }

  async function selectForSwap(player, group, index) {
    if (!substitutionMode) {
      setDetails({ player, group, index, mode: 'pick' });
      return;
    }
    if (!swapSelection) {
      setSwapSelection({ player, group, index });
      return;
    }
    if (swapSelection.group === group) {
      setSwapSelection({ player, group, index });
      return;
    }
    await performSwap(swapSelection.group, swapSelection.index, group, index);
    setSwapSelection(null);
    setSubstitutionMode(false);
  }

  async function moveBench(direction) {
    if (gwState.locked || details?.group !== 'bench') return;
    const target = details.index + direction;
    if (target < 0 || target >= BENCH) return;
    await swapPick('bench', target);
  }

  async function toggleChip(chipKey) {
    if (gwState.locked) return;

    if (pendingTransfers.length) {
      window.alert('Confirm or cancel your pending transfers before changing a chip.');
      return;
    }

    if (!isComplete) {
      window.alert(`كمّل الـ ${SQUAD_SIZE} لاعبين الأول قبل استخدام أي Chip`);
      return;
    }

    if (chipKey === 'freeHit' && Number(gwState.gw) === 1) {
      window.alert('Free Hit cannot be used in Gameweek 1.');
      return;
    }

    const currentGw = Number(gwState.gw) || 1;
    const currentWildcards = {
      benchBoost: null,
      tripleCaptain: null,
      wildcard: null,
      freeHit: null,
      ...(draftTeam.wildcards || {}),
    };

    const usedGw = currentWildcards[chipKey];
    const activeNow = Number(usedGw) === currentGw;

    if (usedGw && !activeNow) return;

    // User-requested behaviour: every active chip can be cancelled before lock.
    if (activeNow) {
      const ok = window.confirm(
        `Cancel ${chipDisplayName(chipKey)} for GW ${currentGw}?` +
        ((chipKey === 'wildcard' || chipKey === 'freeHit')
          ? '\n\nYour squad and transfer state will be restored to the moment before you activated the chip.'
          : '')
      );
      if (!ok) return;

      const nextWildcards = { ...currentWildcards, [chipKey]: null };
      let next = normalizeTeam({ ...draftTeam, wildcards: nextWildcards });
      let ts = getTransferState(next, currentGw);

      if ((chipKey === 'wildcard' || chipKey === 'freeHit') && ts.chipSnapshot) {
        const snap = cloneChipSnapshot(ts.chipSnapshot);
        if (snap?.team) {
          next = normalizeTeam({
            ...next,
            starters: [...snap.team.starters],
            bench: [...snap.team.bench],
            captainId: snap.team.captainId ?? null,
            viceCaptainId: snap.team.viceCaptainId ?? null,
            wildcards: nextWildcards,
          });
        }
        if (snap?.transferState) {
          ts = cloneTransferState(snap.transferState, next, currentGw);
        }
      }

      ts.chipSnapshot = null;
      ts.freeHitSnapshot = null;
      next.transferState = ts;
      await persistTeam(next);
      return;
    }

    const currentActive = ['benchBoost', 'tripleCaptain', 'wildcard', 'freeHit']
      .find((key) => Number(currentWildcards[key]) === currentGw);

    if (currentActive && currentActive !== chipKey) {
      window.alert(`Cancel ${chipDisplayName(currentActive)} first. Only one chip can be active in a Gameweek.`);
      return;
    }

    const nextWildcards = { ...currentWildcards, [chipKey]: currentGw };
    const next = normalizeTeam({ ...draftTeam, wildcards: nextWildcards });
    let ts = getTransferState(next, currentGw);

    if (chipKey === 'wildcard' || chipKey === 'freeHit') {
      ts = {
        ...ts,
        chipSnapshot: {
          team: makeSquadSnapshot(draftTeam),
          transferState: cloneTransferState(ts, draftTeam, currentGw),
        },
        freeTransfers: ts.freeTransfersAtStart,
        transferCost: 0,
        history: {
          ...(ts.history || {}),
          [String(currentGw)]: {
            ...((ts.history || {})[String(currentGw)] || {}),
            transferCost: 0,
            chip: chipKey,
          },
        },
      };

      if (chipKey === 'freeHit') {
        ts.freeHitSnapshot = cloneSquadSnapshot(
          ts.gwStartTeam || makeSquadSnapshot(draftTeam)
        );
      }
    }

    next.transferState = ts;
    await persistTeam(next);
  }

  const pickerPlayers =
    useMemo(() => {
      if (section !== 'transfers') return [];

      const q =
        search
          .trim()
          .toLowerCase();

      return players
        .filter((player) => {
          const id = String(player.id);

          const current = picker
            ? id === String(picker.currentId)
            : false;

          if (
            selectedIdSet.has(id) &&
            !current
          ) {
            return false;
          }

          if (!q) return true;

          const haystack =
            [
              getPlayerName(player),
              getTeamName(player),
              getPlayerPosition(
                player
              ),
            ]
              .join(' ')
              .toLowerCase();

          return haystack.includes(q);
        })
        .sort(
          (a, b) =>
            getPlayerPrice(b) -
            getPlayerPrice(a)
        );
    }, [
      picker,
      players,
      selectedIdSet,
      search,
      section,
    ]);

  if (section === 'home') {
    return (
      <main className="fpl-major-page fpl-home-screen">
        <div className="fpl-major-inner">
          <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
          <FplLocalTabs active="home" onHome={() => {}} onPickTeam={() => switchSection('pick')} onTransfers={() => switchSection('transfers')} onStandings={() => switchSection('standings')} />
          <FantasyHome user={user} team={draftTeam} settings={app.settings} gwState={gwState} info={homeInfo} onPickTeam={() => switchSection('pick')} onTransfers={() => switchSection('transfers')} onStandings={() => switchSection('standings')} onPoints={() => switchSection('points')} onPlayers={() => switchSection('players')} />
        </div>
      </main>
    );
  }

  if (section === 'standings') {
    return (
      <main className="fpl-major-page fpl-standings-screen">
        <div className="fpl-major-inner">
          <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
          <FplLocalTabs active="standings" onHome={() => switchSection('home')} onPickTeam={() => switchSection('pick')} onTransfers={() => switchSection('transfers')} onStandings={() => {}} />
          <StandingsPage />
        </div>
      </main>
    );
  }

  if (!team) {
    return <main className="team-final-page"><style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style><FplLocalTabs active={section} onHome={() => switchSection('home')} onPickTeam={() => switchSection('pick')} onTransfers={() => switchSection('transfers')} onStandings={() => switchSection('standings')} /><div className="fpl-state"><span className="fpl-state-spinner" /><strong>Loading team</strong><small>Getting your latest squad and gameweek state...</small></div></main>;
  }

  if (!players.length) {
    return <main className="team-final-page"><style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style><FplLocalTabs active={section} onHome={() => switchSection('home')} onPickTeam={() => switchSection('pick')} onTransfers={() => switchSection('transfers')} onStandings={() => switchSection('standings')} /><div className="fpl-state"><strong>No players</strong><small>Players have not been added to this fantasy game yet.</small></div></main>;
  }

  if (section === 'points') {
    return (
      <main className="fpl-major-page fpl-points-screen">
        <div className="fpl-major-inner">
          <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
          <FplLocalTabs active="points" onHome={() => switchSection('home')} />
          <GameweekPointsPage
            team={visibleTeam}
            players={players}
            stats={stats}
            viewGw={viewGw}
            gameweeks={gameweekOptions}
            info={homeInfo}
            breakdown={gwBreakdown}
            onGw={setViewGw}
            onPlayer={(player) => { setDetails({ player, group: null, index: null, mode: 'browse', returnSection: 'points' }); setSection('details'); }}
          />
        </div>
      </main>
    );
  }

  if (section === 'players') {
    return (
      <main className="fpl-major-page fpl-browse-screen">
        <div className="fpl-major-inner">
          <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
          <FplLocalTabs active="players" onHome={() => switchSection('home')} />
          <PlayerBrowsePage players={players} stats={stats} ownershipMap={ownershipMap} currentGw={gwState.gw} onPlayer={(player) => { setDetails({ player, group: null, index: null, mode: 'browse', returnSection: 'players' }); setSection('details'); }} />
        </div>
      </main>
    );
  }

  if (details?.player) {
    const detailMode =
      details.mode ||
      (section === 'transfers'
        ? (picker ? 'transfer-select' : 'browse')
        : 'pick');

    return (
      <>
        <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
        <FullPlayerPage
          player={details.player}
          stats={stats}
          matches={matches}
          ownershipMap={ownershipMap}
          currentGw={section === 'pick' ? viewGw : gwState.gw}
          isCaptain={String(draftTeam.captainId) === String(details.player.id)}
          isViceCaptain={String(draftTeam.viceCaptainId) === String(details.player.id)}
          canCaptain={details.group === 'starter'}
          mode={detailMode}
          onBack={() => { const returnSection = details.returnSection; setDetails(null); if (returnSection) setSection(returnSection); }}
          onSelect={detailMode === 'transfer-select' && String(picker?.currentId) !== String(details.player.id) ? () => choosePlayer(details.player) : null}
          onCaptain={detailMode === 'pick' ? makeCaptain : null}
          onViceCaptain={detailMode === 'pick' ? makeViceCaptain : null}
          onSwap={detailMode === 'pick' ? swapPick : null}
          onMoveBench={detailMode === 'pick' ? moveBench : null}
          slotGroup={details.group}
          slotIndex={details.index}
          team={draftTeam}
          allPlayers={players}
          locked={gwState.locked}
          activeSection={section}
          onHome={() => switchSection('home')}
          onPickTeam={() => switchSection('pick')}
          onTransfers={() => switchSection('transfers')}
          onStandings={() => switchSection('standings')}
          onOpenStandings={onOpenStandings}
        />
      </>
    );
  }

  if (section === 'transfers') {
    return (
      <>
        <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>
        <FullTransferPage
          players={pickerPlayers}
          allPlayers={players}
          stats={stats}
          ownershipMap={ownershipMap}
          currentGw={gwState.gw}
          bank={bank}
          transferState={transferState}
          unlimitedTransfers={unlimitedTransfers}
          activeChip={freeHitActive ? 'Free Hit' : wildcardActive ? 'Wildcard' : null}
          currentId={picker?.currentId || null}
          selectedTarget={picker}
          team={draftTeam}
          locked={gwState.locked}
          search={search}
          setSearch={setSearch}
          onTarget={(group, index) => {
            if (gwState.locked) return;
            const currentId = group === 'starter'
              ? draftTeam.starters[index]
              : draftTeam.bench[index];
            setSearch('');
            setPicker({ group, index, currentId: currentId || null });
          }}
          onClearTarget={() => setPicker(null)}
          onSelect={choosePlayer}
          onDetails={(player) => setDetails({
            player,
            group: picker?.group || null,
            index: picker?.index ?? null,
            mode: picker ? 'transfer-select' : 'browse',
          })}
          wildcards={draftTeam.wildcards}
          onToggleChip={toggleChip}
          pendingTransfers={pendingTransfers}
          onConfirmTransfers={confirmTransfers}
          onCancelTransfers={cancelTransfers}
          onHome={() => switchSection('home')}
          onPickTeam={() => switchSection('pick')}
          onTransfers={() => switchSection('transfers')}
          onStandings={() => switchSection('standings')}
          onOpenStandings={onOpenStandings}
        />
      </>
    );
  }

  return (
    <>
      <style>{CSS + MAJOR_CSS + FPL_FULLSCREEN_CSS}</style>

      <main className="team-final-page">
        <FplLocalTabs
          active="pick"
          onHome={() => switchSection('home')}
          onPickTeam={() => switchSection('pick')}
          onTransfers={() => switchSection('transfers')}
          onStandings={() => switchSection('standings')}
          onOpenStandings={onOpenStandings}
        />

        <section className="fpl-screen-heading">
          <div>
            <span>Fantasy</span>
            <h1>Pick Team</h1>
            <p>Set your captain and bench order here. Player transfers are only available from the Transfers tab.</p>
          </div>
          <strong>GW {viewGw}</strong>
        </section>

        <div className="fpl-gw-switcher">
          <button type="button" disabled={viewGw <= gameweekOptions[0]} onClick={() => setViewGw(gameweekOptions[gameweekOptions.indexOf(viewGw) - 1])}>Previous GW</button>
          <label><span>Gameweek</span><select value={viewGw} onChange={(event) => setViewGw(Number(event.target.value))}>{gameweekOptions.map((gw) => <option key={gw} value={gw}>Gameweek {gw}</option>)}</select></label>
          <button type="button" disabled={viewGw >= gameweekOptions[gameweekOptions.length - 1]} onClick={() => setViewGw(gameweekOptions[gameweekOptions.indexOf(viewGw) + 1])}>Next GW</button>
        </div>

        {viewingHistorical && <div className="fpl-history-notice">Viewing Gameweek {viewGw}. This squad is read only{historicalSnapshot ? '' : ' because no saved squad snapshot exists'}.</div>}

        {!viewingHistorical && (
          <div className={`fpl-substitution-bar ${substitutionMode ? 'active' : ''}`}>
            <div><strong>{substitutionMode ? (swapSelection ? `${getPlayerName(swapSelection.player)} selected` : 'Select a player') : 'Starting XI & bench'}</strong><small>{substitutionMode ? (swapSelection ? `Now select a ${swapSelection.group === 'starter' ? 'bench' : 'starting'} player` : 'Choose one player, then his replacement') : 'Swap players without making a transfer'}</small></div>
            <button type="button" disabled={gwState.locked} onClick={() => { setSubstitutionMode((active) => !active); setSwapSelection(null); }}>{substitutionMode ? 'Cancel' : 'Make substitutions'}</button>
          </div>
        )}

        <div className="tf-deadline">
          GAMEWEEK {viewGw} · {viewingHistorical ? 'HISTORY' : gwState.locked ? 'LOCKED' : 'OPEN FOR CHANGES'}
        </div>

        <section className="tf-stats">
          <TopStat label="GW Points" value={gwBreakdown.total} />
          <TopStat label="Overall" value={overallPoints} />
          <TopStat label="Free Transfers" value={unlimitedTransfers ? '∞' : transferState.freeTransfers} budget />
          <TopStat label="Transfer Cost" value={transferState.transferCost > 0 ? `-${transferState.transferCost}` : '0'} danger={transferState.transferCost > 0} />
          <TopStat label="Bank" value={`${fmt(bank)}M`} budget />
        </section>

        <div className="tf-transfer-note">
          {unlimitedTransfers
            ? <><strong>{freeHitActive ? 'Free Hit' : 'Wildcard'} active:</strong> unlimited free transfers. You can cancel it before the GW locks.</>
            : transferState.freeTransfers > 0
            ? <><strong>{transferState.freeTransfers}</strong> free transfer{transferState.freeTransfers === 1 ? '' : 's'} available. Unused transfers roll over up to <strong>{MAX_FREE_TRANSFERS}</strong>.</>
            : <>Next transfer costs <strong>-{TRANSFER_HIT_POINTS} points</strong>.</>}
        </div>

        {!isComplete && (
          <div className="tf-alert">
            التشكيلة فيها <b>{pickedCount}</b> من <b>{SQUAD_SIZE}</b> لاعبين. اختار 4 أساسي و3 بدلاء.
          </div>
        )}

        <section className="tf-pitch">
          <div className="tf-half-line" />
          <div className="tf-circle" />
          <div className="tf-box top" />
          <div className="tf-box bottom" />

          <div className="tf-pitch-content">
            <div className="fpl-pitch-toolbar">
              <label>
                <span>Gameweek</span>
                <select value={viewGw} onChange={(event) => setViewGw(Number(event.target.value))}>
                  {gameweekOptions.map((gw) => <option key={gw} value={gw}>GW {gw}</option>)}
                </select>
              </label>
              <div>
                <strong>{viewingHistorical ? `GW ${viewGw} history` : gwState.locked ? `GW ${viewGw} locked` : `GW ${viewGw} open`}</strong>
                <small>{viewingHistorical ? `${gwBreakdown.total} points` : substitutionMode ? (swapSelection ? `Select a ${swapSelection.group === 'starter' ? 'bench' : 'starting'} player` : 'Select first player') : `${gwBreakdown.total} GW points`}</small>
              </div>
              {!viewingHistorical && (
                <button type="button" disabled={gwState.locked} className={substitutionMode ? 'active' : ''} onClick={() => { setSubstitutionMode((active) => !active); setSwapSelection(null); }}>
                  {substitutionMode ? 'Cancel' : 'Make subs'}
                </button>
              )}
            </div>
            <div className="tf-row">
              {[0, 1].map((index) => (
                <SquadSlot
                  key={`s-${index}`}
                  player={getPlayerById(players, visibleTeam.starters[index])}
                  isCaptain={String(visibleTeam.captainId) === String(visibleTeam.starters[index])}
                  isViceCaptain={String(visibleTeam.viceCaptainId) === String(visibleTeam.starters[index])}
                  ownership={getOwnershipForPlayer(ownershipMap, getPlayerById(players, visibleTeam.starters[index]))}
                  gw={viewGw}
                  gwPoints={getPlayerGwPoints(stats, visibleTeam.starters[index], viewGw)}
                  selected={swapSelection?.group === 'starter' && swapSelection?.index === index}
                  onEmpty={() => !viewingHistorical && switchSection('transfers')}
                  onPlayer={(player) => viewingHistorical ? setDetails({ player, group:null, index, mode:'browse' }) : selectForSwap(player, 'starter', index)}
                />
              ))}
            </div>

            <div className="tf-row row2">
              {[2, 3].map((index) => (
                <SquadSlot
                  key={`s-${index}`}
                  player={getPlayerById(players, visibleTeam.starters[index])}
                  isCaptain={String(visibleTeam.captainId) === String(visibleTeam.starters[index])}
                  isViceCaptain={String(visibleTeam.viceCaptainId) === String(visibleTeam.starters[index])}
                  ownership={getOwnershipForPlayer(ownershipMap, getPlayerById(players, visibleTeam.starters[index]))}
                  gw={viewGw}
                  gwPoints={getPlayerGwPoints(stats, visibleTeam.starters[index], viewGw)}
                  selected={swapSelection?.group === 'starter' && swapSelection?.index === index}
                  onEmpty={() => !viewingHistorical && switchSection('transfers')}
                  onPlayer={(player) => viewingHistorical ? setDetails({ player, group:null, index, mode:'browse' }) : selectForSwap(player, 'starter', index)}
                />
              ))}
            </div>

            <div className="tf-bench-title">Bench Order</div>
            <div className="tf-bench">
              {[0, 1, 2].map((index) => (
                <SquadSlot
                  key={`b-${index}`}
                  bench
                  benchOrder={index + 1}
                  player={getPlayerById(players, visibleTeam.bench[index])}
                  ownership={getOwnershipForPlayer(ownershipMap, getPlayerById(players, visibleTeam.bench[index]))}
                  gw={viewGw}
                  gwPoints={getPlayerGwPoints(stats, visibleTeam.bench[index], viewGw)}
                  selected={swapSelection?.group === 'bench' && swapSelection?.index === index}
                  onEmpty={() => !viewingHistorical && switchSection('transfers')}
                  onPlayer={(player) => viewingHistorical ? setDetails({ player, group:null, index, mode:'browse' }) : selectForSwap(player, 'bench', index)}
                />
              ))}
            </div>
            <div className="tf-bench-help">Auto-sub priority: 1 → 2 → 3</div>
            {!!gwBreakdown.autosubs.length && <div className="fpl-autosub-note">{gwBreakdown.autosubs.map((sub) => `${getPlayerName(getPlayerById(players, sub.in))} replaced ${getPlayerName(getPlayerById(players, sub.out))}`).join(' · ')}</div>}
          </div>
        </section>

        <div className="tf-actions">
          <button
            type="button"
            className="tf-main-btn"
            onClick={() => switchSection('transfers')}
          >
            {isComplete ? 'Go to Transfers' : 'Complete squad in Transfers'}
          </button>

          <button type="button" className="tf-ghost-btn" onClick={() => window.scrollTo({ top:0, behavior:'smooth' })}>
            {isComplete ? 'Team Ready' : `${pickedCount}/${SQUAD_SIZE}`}
          </button>
        </div>

      </main>
    </>
  );
}

function FantasyHome({ user, team, settings, gwState, info, onPickTeam, onTransfers, onStandings, onPoints, onPlayers }) {
  const teamName = team?.teamName || team?.name || `${user}'s Team`;
  const squadCount = [...(team?.starters || []), ...(team?.bench || [])].filter(Boolean).length;
  return (
    <div className="fpl-home-page">
      <section className="fpl-home-hero">
        <button type="button" className="fpl-home-manager" onClick={onPickTeam}>
          <span className="fpl-home-logo"><BrandGlyph logoUrl={settings?.logoUrl} /></span>
          <span><strong>{teamName}</strong><small>{user}</small></span>
          <b aria-hidden="true">→</b>
        </button>

        <div className="fpl-home-divider" />
        <button type="button" className="fpl-home-score" onClick={onPickTeam}>
          <span className="fpl-home-gw">Gameweek {gwState.gw}</span>
          {info.loading ? (
            <span className="fpl-home-loading">Loading your points...</span>
          ) : (
            <span className="fpl-home-score-grid">
              <span><b>{info.average}</b><small>Average</small></span>
              <span className="main"><b>{info.gwPoints}</b><small>Points →</small></span>
              <span><b>{info.highest}</b><small>Highest</small></span>
            </span>
          )}
        </button>

        <div className="fpl-home-divider short" />
        <div className="fpl-home-rank-row">
          <span><small>Fagalla rank</small><strong>{info.loading ? '—' : info.rank ? `#${info.rank}` : 'Unranked'}</strong></span>
          <span><small>Overall points</small><strong>{info.loading ? '—' : info.total}</strong></span>
          <span><small>Squad</small><strong>{squadCount}/{SQUAD_SIZE}</strong></span>
        </div>

        {info.error && <div className="fpl-home-error">{info.error}</div>}
        <div className="fpl-home-status">Gameweek {gwState.gw} · {gwState.locked ? 'Team locked' : 'Open for changes'}</div>
        <div className="fpl-home-actions">
          <button type="button" onClick={onPickTeam}><span>♙</span>Pick Team</button>
          <button type="button" onClick={onTransfers}><span>⇄</span>Transfers</button>
        </div>
      </section>

      <section className="fpl-home-links">
        <button type="button" onClick={onStandings}><span><strong>Fagalla League</strong><small>See your position and every manager</small></span><b>›</b></button>
        <button type="button" onClick={onPoints}><span><strong>Gameweek points</strong><small>Open your scoring team on the pitch</small></span><b>›</b></button>
        <button type="button" onClick={onPlayers}><span><strong>Player prices & stats</strong><small>Search the full player list</small></span><b>›</b></button>
      </section>
    </div>
  );
}

function PointsPlayer({ id, player, stats, gw, captainId, viceCaptainId, tripleCaptain, benchOrder, onPlayer }) {
  if (!player) return <div className="fpl-points-player empty"><span>Empty</span></div>;
  const rawPoints = getPlayerGwPoints(stats, id, gw);
  const captain = String(id) === String(captainId);
  const points = captain ? rawPoints * (tripleCaptain ? 3 : 2) : rawPoints;
  return (
    <button type="button" className="fpl-points-player" onClick={() => onPlayer(player)}>
      {benchOrder && <i>{benchOrder}</i>}
      <span className="fpl-points-kit"><PlayerImageOnly player={player} /></span>
      <strong>{getPlayerName(player)}</strong>
      <small>{points}</small>
      {captain && <b className="fpl-points-badge">C</b>}
      {!captain && String(id) === String(viceCaptainId) && <b className="fpl-points-badge vice">V</b>}
    </button>
  );
}

function GameweekPointsPage({ team, players, stats, viewGw, gameweeks, info, breakdown, onGw, onPlayer }) {
  const tripleCaptain = Number(team.wildcards?.tripleCaptain) === Number(viewGw);
  const renderPlayer = (id, benchOrder, slot) => <PointsPlayer key={`${benchOrder ? 'b' : 's'}-${slot}`} id={id} player={getPlayerById(players, id)} stats={stats} gw={viewGw} captainId={breakdown.captainId || team.captainId} viceCaptainId={team.viceCaptainId} tripleCaptain={tripleCaptain} benchOrder={benchOrder} onPlayer={onPlayer} />;
  return (
    <div className="fpl-points-page">
      <header className="fpl-points-head">
        <div className="fpl-points-gw-nav">
          <button type="button" disabled={viewGw <= gameweeks[0]} onClick={() => onGw(gameweeks[gameweeks.indexOf(viewGw) - 1])}>‹</button>
          <label>Gameweek <select value={viewGw} onChange={(event) => onGw(Number(event.target.value))}>{gameweeks.map((gw) => <option key={gw} value={gw}>{gw}</option>)}</select></label>
          <button type="button" disabled={viewGw >= gameweeks[gameweeks.length - 1]} onClick={() => onGw(gameweeks[gameweeks.indexOf(viewGw) + 1])}>›</button>
        </div>
        <div className="fpl-points-summary">
          <span><b>{Number(viewGw) === Number(gameweeks[gameweeks.length - 1]) ? info.average : '—'}</b><small>Average</small></span>
          <span className="main"><b>{breakdown.total}</b><small>Total Pts</small></span>
          <span><b>{Number(viewGw) === Number(gameweeks[gameweeks.length - 1]) ? info.highest : '—'}</b><small>Highest</small></span>
        </div>
      </header>
      <section className="fpl-points-pitch">
        <div className="fpl-points-box top" /><div className="fpl-points-half" /><div className="fpl-points-circle" />
        <div className="fpl-points-row">{team.starters.slice(0, 2).map((id, index) => renderPlayer(id, null, index))}</div>
        <div className="fpl-points-row">{team.starters.slice(2, 4).map((id, index) => renderPlayer(id, null, index + 2))}</div>
        <div className="fpl-points-bench"><div>BENCH</div><span>{team.bench.map((id, index) => renderPlayer(id, index + 1, index))}</span></div>
      </section>
      {!!breakdown.autosubs.length && <div className="fpl-points-autosubs">Autosubs: {breakdown.autosubs.map((sub) => `${getPlayerName(getPlayerById(players, sub.in))} in`).join(' · ')}</div>}
    </div>
  );
}

function PlayerBrowsePage({ players, stats, ownershipMap, currentGw, onPlayer }) {
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState('all');
  const [sort, setSort] = useState('points');
  const positions = [...new Set(players.map(getPlayerPosition).filter(Boolean))];
  const rows = players.map((player) => ({ player, aggregate: getPlayerSeasonStats(stats, player.id) }))
    .filter(({ player }) => position === 'all' || getPlayerPosition(player) === position)
    .filter(({ player }) => [getPlayerName(player), getTeamName(player), getPlayerPosition(player)].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'price' ? getPlayerPrice(b.player) - getPlayerPrice(a.player) : sort === 'name' ? getPlayerName(a.player).localeCompare(getPlayerName(b.player)) : b.aggregate.points - a.aggregate.points);
  return (
    <div className="fpl-browse-page">
      <header><span>PLAYER DATABASE</span><h1>Prices & Stats</h1><p>Real Fagalla players and gameweek performance</p></header>
      <div className="fpl-browse-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" />
        <select value={position} onChange={(event) => setPosition(event.target.value)}><option value="all">All positions</option>{positions.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="points">Total points</option><option value="price">Price</option><option value="name">Name</option></select>
      </div>
      <section className="fpl-browse-list">
        <div className="fpl-browse-title"><strong>{rows.length} players</strong><span>GW {currentGw}</span></div>
        {rows.map(({ player, aggregate }) => (
          <button type="button" key={player.id} className="fpl-browse-player" onClick={() => onPlayer(player)}>
            <span className="kit"><PlayerImageOnly player={player} /></span>
            <span className="identity"><strong>{getPlayerName(player)}</strong><small>{getTeamName(player) || getPlayerPosition(player)} · {getPlayerPosition(player)}</small></span>
            <span><small>Price</small><b>£{fmt(getPlayerPrice(player))}m</b></span>
            <span><small>GW</small><b>{getPlayerGwPoints(stats, player.id, currentGw)}</b></span>
            <span><small>Total</small><b>{aggregate.points}</b></span>
            <span><small>Selected</small><b>{getOwnershipForPlayer(ownershipMap, player) || 0}%</b></span>
            <i>›</i>
          </button>
        ))}
        {!rows.length && <div className="fpl-state"><strong>No players found</strong><small>Try another search or position.</small></div>}
      </section>
    </div>
  );
}

function FullTransferPage({
  players,
  allPlayers,
  stats,
  ownershipMap,
  currentGw,
  bank,
  transferState,
  unlimitedTransfers,
  currentId,
  selectedTarget,
  team,
  locked,
  search,
  setSearch,
  onTarget,
  onClearTarget,
  onSelect,
  onDetails,
  wildcards,
  onToggleChip,
  pendingTransfers,
  onConfirmTransfers,
  onCancelTransfers,
  onHome,
  onPickTeam,
  onTransfers,
  onStandings,
  onOpenStandings,
}) {
  const [position, setPosition] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const teams = useMemo(() => {
    return [...new Set((allPlayers || []).map(getTeamName).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
  }, [allPlayers]);

  const positions = useMemo(() => {
    return [...new Set((allPlayers || []).map(getPlayerPosition).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
  }, [allPlayers]);

  const outgoingPlayer = getPlayerById(allPlayers, currentId);
  const spendable = bank + getPlayerPrice(outgoingPlayer);

  const rows = useMemo(() => {
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);

    return (players || [])
      .map((player) => ({ player, agg: getPlayerSeasonStats(stats, player.id) }))
      .filter(({ player }) => position === 'all' || String(getPlayerPosition(player)) === position)
      .filter(({ player }) => teamFilter === 'all' || String(getTeamName(player)) === teamFilter)
      .filter(({ player }) => min === null || getPlayerPrice(player) >= min)
      .filter(({ player }) => max === null || getPlayerPrice(player) <= max)
      .sort((a,b) => {
        if (sortBy === 'price') return getPlayerPrice(b.player) - getPlayerPrice(a.player);
        if (sortBy === 'priceLow') return getPlayerPrice(a.player) - getPlayerPrice(b.player);
        if (sortBy === 'ownership') return (getOwnershipForPlayer(ownershipMap,b.player)||0) - (getOwnershipForPlayer(ownershipMap,a.player)||0);
        if (sortBy === 'form') return b.agg.form - a.agg.form;
        if (sortBy === 'name') return getPlayerName(a.player).localeCompare(getPlayerName(b.player));
        return b.agg.points - a.agg.points;
      });
  }, [players, stats, position, teamFilter, sortBy, ownershipMap, minPrice, maxPrice]);

  return (
    <main className="fpl-major-page fpl-transfer-screen">
      <div className="fpl-major-inner">
        <FplLocalTabs
          active="transfers"
          onHome={onHome}
          onPickTeam={onPickTeam}
          onTransfers={onTransfers}
          onStandings={onStandings}
          onOpenStandings={onOpenStandings}
        />

        <section className="fpl-screen-heading fpl-screen-heading-transfer">
          <div>
            <span>Fantasy</span>
            <h1>Transfers</h1>
            <p>Select a player from your squad first, then choose the replacement from the full player list below.</p>
          </div>
          <strong>GW {currentGw}</strong>
        </section>

        <section className="fpl-major-hero fpl-transfer-hero">
          <div className="fpl-major-summary">
            <div><span>FREE TRANSFERS</span><strong>{unlimitedTransfers ? '∞' : transferState.freeTransfers}</strong></div>
            <div><span>TRANSFERS MADE</span><strong>{transferState.transfersMade}</strong></div>
            <div><span>TRANSFER COST</span><strong>{transferState.transferCost ? `-${transferState.transferCost}` : '0'}</strong></div>
            <div><span>BANK</span><strong>£{fmt(bank)}m</strong></div>
            <div><span>TEAM VALUE</span><strong>£{fmt(STARTING_BUDGET - bank)}m</strong></div>
            <div><span>AVAILABLE</span><strong>{selectedTarget ? `£${fmt(spendable)}m` : '—'}</strong></div>
          </div>
        </section>

        <WildcardPanel
          wildcards={wildcards}
          gw={currentGw}
          locked={locked}
          onToggle={onToggleChip}
          compact
        />

        <TransferSquadSelector
          team={team}
          players={allPlayers}
          selectedTarget={selectedTarget}
          locked={locked}
          onTarget={onTarget}
          currentGw={currentGw}
          freeTransfers={unlimitedTransfers ? '∞' : transferState.freeTransfers}
          bank={bank}
        />

        <div className={`fpl-transfer-instruction ${selectedTarget ? 'ready' : ''}`}>
          {selectedTarget ? (
            <>
              <div>
                <span>{outgoingPlayer ? 'PLAYER OUT' : 'EMPTY SLOT'}</span>
                <strong>{outgoingPlayer ? getPlayerName(outgoingPlayer) : `Choose a player for this ${selectedTarget.group === 'bench' ? 'bench' : 'starter'} slot`}</strong>
                <small>You can spend up to £{fmt(spendable)}m.</small>
              </div>
              <button type="button" onClick={onClearTarget}>Change slot</button>
            </>
          ) : (
            <div>
              <span>STEP 1</span>
              <strong>Select a player or an empty slot in your squad.</strong>
              <small>The Pick Team tab cannot make transfers.</small>
            </div>
          )}
        </div>

        {pendingTransfers.length > 0 && (
          <section className="fpl-transfer-confirm" aria-live="polite">
            <div className="fpl-transfer-confirm-head">
              <div>
                <span>CONFIRM TRANSFERS</span>
                <strong>{pendingTransfers.length} change{pendingTransfers.length === 1 ? '' : 's'} ready</strong>
              </div>
              <b className={transferState.transferCost ? 'cost' : ''}>{transferState.transferCost ? `-${transferState.transferCost} pts` : '0 pts'}</b>
            </div>
            <div className="fpl-transfer-pairs">
              {pendingTransfers.map((transfer, index) => (
                <div key={`${transfer.group}-${transfer.index}-${index}`}>
                  <span><small>OUT</small>{getPlayerName(getPlayerById(allPlayers, transfer.outId)) || 'Empty slot'}</span>
                  <i aria-hidden="true">→</i>
                  <span><small>IN</small>{getPlayerName(getPlayerById(allPlayers, transfer.inId))}</span>
                </div>
              ))}
            </div>
            <p>{Math.min(pendingTransfers.length, transferState.freeTransfersAtStart)} free transfer{pendingTransfers.length === 1 ? '' : 's'} used · Bank £{fmt(bank)}m</p>
            <div className="fpl-transfer-confirm-actions">
              <button type="button" className="fpl-secondary" onClick={onCancelTransfers}>Cancel</button>
              <button type="button" className="fpl-primary" onClick={onConfirmTransfers} disabled={locked}>Confirm transfers</button>
            </div>
          </section>
        )}

        {selectedTarget && <section className="fpl-filter-panel fpl-filter-panel-advanced">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player, team or position" />
          <select value={position} onChange={(e) => setPosition(e.target.value)}>
            <option value="all">All positions</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="all">All teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="fpl-price-filter">
            <label>Min price</label>
            <div><span>£</span><input type="number" step="0.1" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0.0" /></div>
          </div>
          <div className="fpl-price-filter">
            <label>Max price</label>
            <div><span>£</span><input type="number" step="0.1" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Any" /></div>
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="points">Sort: Total points</option>
            <option value="form">Sort: Form</option>
            <option value="price">Sort: Price high-low</option>
            <option value="priceLow">Sort: Price low-high</option>
            <option value="ownership">Sort: Selected %</option>
            <option value="name">Sort: Name</option>
          </select>
        </section>}

        {selectedTarget && <section className="fpl-list-shell">
          <div className="fpl-list-title">
            <strong>Player selection</strong>
            <span>{rows.length} players · {selectedTarget ? 'select a replacement' : 'browse stats, then choose player out above'}</span>
          </div>
          <div className="fpl-table-wrap">
            <table className="fpl-player-table">
              <thead>
                <tr>
                  <th>Player</th><th>Position</th><th>Price</th><th>Sel %</th><th>Total Pts</th><th>GW Pts</th><th>Form</th><th>Played</th>
                  <th>G</th><th>A</th><th>Saves</th><th>CS</th><th>MOTM</th><th>Pen S</th><th>Pen M</th><th>YC</th><th>RC</th><th>OG</th><th>Info</th><th>Select</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({player, agg}) => {
                  const isCurrent = String(player.id) === String(currentId);
                  const tooExpensive = selectedTarget && getPlayerPrice(player) > spendable;
                  const selectionDisabled = !selectedTarget || isCurrent || tooExpensive || locked || player.locked;
                  return (
                    <tr key={player.id} className={`${isCurrent ? 'current' : ''} ${tooExpensive ? 'unaffordable' : ''}`} onClick={() => onDetails(player)}>
                      <td>
                        <div className="fpl-player-cell">
                          <div className="fpl-mini-shirt"><PlayerImageOnly player={player} /></div>
                          <div className="fpl-player-ident">
                            <strong>{getPlayerName(player)} {isCurrent && <span className="fpl-current-tag">CURRENT</span>}</strong>
                            <small>{getTeamName(player) || 'Team'} · {getPlayerPosition(player)}</small>
                          </div>
                        </div>
                      </td>
                      <td>{getPlayerPosition(player)}</td>
                      <td>£{fmt(getPlayerPrice(player))}m</td>
                      <td>{getOwnershipForPlayer(ownershipMap, player) ?? 0}%</td>
                      <td className="fpl-points-col">{agg.points}</td>
                      <td className="fpl-points-col">{getPlayerGwPoints(stats, player.id, currentGw)}</td>
                      <td className="fpl-green">{agg.form}</td>
                      <td>{agg.played}</td><td>{agg.goals}</td><td>{agg.assists}</td><td>{agg.saves}</td><td>{agg.cleanSheet}</td><td>{agg.motm}</td>
                      <td>{agg.penSave}</td><td>{agg.penMiss}</td><td>{agg.yellow}</td><td>{agg.red}</td><td>{agg.ownGoal}</td>
                      <td><button type="button" className="fpl-info-btn" onClick={(e) => {e.stopPropagation(); onDetails(player);}}>Stats</button></td>
                      <td>
                        <button
                          type="button"
                          className="fpl-select-btn"
                          disabled={selectionDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!selectionDisabled) onSelect(player);
                          }}
                        >
                          {!selectedTarget ? 'Pick out first' : isCurrent ? 'Current' : player.locked ? 'Unavailable' : tooExpensive ? 'Too expensive' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="tf-empty-text" style={{margin:14}}>No players match these filters.</div>}
        </section>}
      </div>
    </main>
  );
}

function TransferSquadSelector({ team, players, selectedTarget, locked, onTarget, currentGw, freeTransfers, bank }) {
  const starters = Array.isArray(team?.starters) ? team.starters : [];
  const bench = Array.isArray(team?.bench) ? team.bench : [];

  const renderPlayer = (id, group, index, benchOrder = null) => {
    const player = getPlayerById(players, id);
    const active = selectedTarget?.group === group && Number(selectedTarget?.index) === Number(index);
    return (
      <button
        type="button"
        key={`${group}-${index}`}
        className={`fpl-transfer-squad-player ${active ? 'selected' : ''} ${!player ? 'empty' : ''}`}
        disabled={locked}
        onClick={() => onTarget(group, index)}
      >
        {benchOrder && <span className="fpl-transfer-bench-order">{benchOrder}</span>}
        {player ? (
          <>
            <span className="fpl-transfer-shirt"><PlayerImageOnly player={player} /></span>
            <strong>{getPlayerName(player)}</strong>
            <small>£{fmt(getPlayerPrice(player))}m</small>
          </>
        ) : (
          <>
            <span className="fpl-transfer-empty-plus">+</span>
            <strong>Empty slot</strong>
            <small>Select to add</small>
          </>
        )}
        {active && <em>{player ? 'OUT' : 'ADD'}</em>}
      </button>
    );
  };

  return (
    <section className="fpl-transfer-squad-card">
      <div className="fpl-transfer-squad-head">
        <div><span>GAMEWEEK {currentGw} · {freeTransfers} FT · £{fmt(bank)}m BANK</span><strong>{selectedTarget ? 'Player selected for transfer' : 'Select a player to transfer out'}</strong></div>
        <small>{locked ? 'Gameweek locked' : selectedTarget ? 'Choose the replacement below' : 'Tap any player'}</small>
      </div>
      <div className="fpl-transfer-squad-pitch">
        <div className="fpl-transfer-starters">
          {starters.map((id, index) => renderPlayer(id, 'starter', index))}
        </div>
        <div className="fpl-transfer-bench-label">SUBSTITUTES</div>
        <div className="fpl-transfer-bench-row">
          {bench.map((id, index) => renderPlayer(id, 'bench', index, index + 1))}
        </div>
      </div>
    </section>
  );
}

function FullPlayerPage({
  player,
  stats,
  matches,
  ownershipMap,
  currentGw,
  isCaptain,
  isViceCaptain,
  canCaptain,
  mode,
  onBack,
  onSelect,
  onCaptain,
  onViceCaptain,
  onSwap,
  onMoveBench,
  slotGroup,
  slotIndex,
  team,
  allPlayers,
  locked,
  activeSection,
  onHome,
  onPickTeam,
  onTransfers,
  onStandings,
  onOpenStandings,
}) {
  const agg = getPlayerSeasonStats(stats, player.id);
  const gwRows = getPlayerGwDetailedRows(stats, player.id);
  const ownership = getOwnershipForPlayer(ownershipMap, player);
  const fixtures = getNextFixtures(player, matches, currentGw).slice(0,5);
  const suggestedGw = gwRows.some((r) => Number(r.gw) === Number(currentGw))
    ? String(currentGw)
    : String(gwRows[gwRows.length - 1]?.gw ?? currentGw);
  const [selectedGw, setSelectedGw] = useState(suggestedGw);
  const selectedRow = gwRows.find((r) => String(r.gw) === String(selectedGw)) || null;

  return (
    <main className="fpl-major-page fpl-player-screen">
      <div className="fpl-major-inner">
        <FplLocalTabs
          active={activeSection === 'transfers' ? 'transfers' : 'pick'}
          onHome={onHome}
          onPickTeam={onPickTeam}
          onTransfers={onTransfers}
          onStandings={onStandings}
          onOpenStandings={onOpenStandings}
        />

        <div className="fpl-major-backbar fpl-player-backbar">
          <button type="button" className="fpl-back-btn" onClick={onBack}>← Back</button>
          <div className="fpl-major-gw">GAMEWEEK {currentGw}</div>
        </div>

        <section className="fpl-major-hero fpl-player-hero">
          <div className="fpl-player-visual"><PlayerImageOnly player={player} large /></div>
          <div className="fpl-player-headcopy">
            <div className="fpl-major-eyebrow">{getTeamName(player) || 'Team'} · {getPlayerPosition(player)}</div>
            <h1>{getPlayerName(player)}</h1>
            <div className="fpl-player-sub">£{fmt(getPlayerPrice(player))}m · {ownership ?? 0}% selected · {agg.points} total points</div>
            <div className="fpl-player-actions">
              {mode === 'transfer-select' && onSelect && (
                <button type="button" className="fpl-primary" onClick={onSelect}>Select this player</button>
              )}
              {mode === 'pick' && canCaptain && onCaptain && (
                <button type="button" className="fpl-primary" disabled={isCaptain || locked} onClick={onCaptain}>
                  {isCaptain ? 'Captain selected' : 'Make captain'}
                </button>
              )}
              {mode === 'pick' && canCaptain && onViceCaptain && (
                <button type="button" className="fpl-secondary" disabled={isViceCaptain || locked} onClick={onViceCaptain}>
                  {isViceCaptain ? 'Vice captain selected' : 'Make vice captain'}
                </button>
              )}
              {mode === 'pick' && (
                <button type="button" className="fpl-secondary" onClick={onTransfers}>Go to Transfers</button>
              )}
            </div>
            {mode === 'pick' && onSwap && (
              <div className="fpl-pick-actions">
                <b>{slotGroup === 'bench' ? 'Swap into starting team' : 'Swap with bench'}</b>
                <div>
                  {(slotGroup === 'bench' ? team.starters : team.bench).map((id, index) => {
                    const target = getPlayerById(allPlayers, id);
                    return (
                      <button type="button" key={`${slotGroup}-${index}`} disabled={locked || !target} onClick={() => onSwap(slotGroup === 'bench' ? 'starter' : 'bench', index)}>
                        {target ? getPlayerName(target) : 'Empty'}
                      </button>
                    );
                  })}
                </div>
                {slotGroup === 'bench' && (
                  <div className="fpl-bench-order-actions">
                    <button type="button" disabled={locked || slotIndex === 0} onClick={() => onMoveBench(-1)}>Move up</button>
                    <button type="button" disabled={locked || slotIndex === BENCH - 1} onClick={() => onMoveBench(1)}>Move down</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="fpl-stat-grid">
          <FplStat label="Price" value={`£${fmt(getPlayerPrice(player))}m`} />
          <FplStat label="Selected" value={`${ownership ?? 0}%`} />
          <FplStat label="Total points" value={agg.points} />
          <FplStat label="Form" value={agg.form} />
          <FplStat label="Played" value={agg.played} />
          <FplStat label="Goals" value={agg.goals} />
          <FplStat label="Assists" value={agg.assists} />
          <FplStat label="Saves" value={agg.saves} />
          <FplStat label="Clean sheets" value={agg.cleanSheet} />
          <FplStat label="MOTM" value={agg.motm} />
          <FplStat label="Pen saves" value={agg.penSave} />
          <FplStat label="Pen misses" value={agg.penMiss} />
          <FplStat label="Yellow" value={agg.yellow} />
          <FplStat label="Red" value={agg.red} />
          <FplStat label="Own goals" value={agg.ownGoal} />
          <FplStat label="Avg / played" value={agg.avg} />
          <FplStat label="Best GW" value={agg.bestGw} />
          <FplStat label="Best score" value={agg.bestPoints} />
        </section>

        <section className="fpl-gw-focus-card">
          <div className="fpl-card-head fpl-gw-focus-head">
            <div>
              <span>GAMEWEEK DETAIL</span>
              <strong>Every Gameweek is shown separately</strong>
            </div>
            <select value={selectedGw} onChange={(e) => setSelectedGw(e.target.value)}>
              {gwRows.map((r) => <option key={r.gw} value={String(r.gw)}>GW {r.gw}</option>)}
              {!gwRows.length && <option value={String(currentGw)}>GW {currentGw}</option>}
            </select>
          </div>

          {selectedRow ? (
            <div className="fpl-gw-focus-grid">
              <FplStat label="Played" value={selectedRow.played ? 'Yes' : 'No'} />
              <FplStat label="Points" value={selectedRow.points} />
              <FplStat label="Goals" value={selectedRow.goals} />
              <FplStat label="Assists" value={selectedRow.assists} />
              <FplStat label="Saves" value={selectedRow.saves} />
              <FplStat label="Clean sheet" value={selectedRow.cleanSheet} />
              <FplStat label="MOTM" value={selectedRow.motm} />
              <FplStat label="Pen saves" value={selectedRow.penSave} />
              <FplStat label="Pen misses" value={selectedRow.penMiss} />
              <FplStat label="Yellow" value={selectedRow.yellow} />
              <FplStat label="Red" value={selectedRow.red} />
              <FplStat label="Own goal" value={selectedRow.ownGoal} />
            </div>
          ) : (
            <div className="tf-empty-text">No statistics recorded for this Gameweek.</div>
          )}
        </section>

        <div className="fpl-two-col">
          <section className="fpl-card">
            <div className="fpl-card-head">Gameweek history</div>
            <div className="fpl-table-wrap">
              <table className="fpl-gw-detail-table">
                <thead><tr><th>GW</th><th>Played</th><th>Pts</th><th>G</th><th>A</th><th>Saves</th><th>CS</th><th>MOTM</th><th>Pen S</th><th>Pen M</th><th>YC</th><th>RC</th><th>OG</th></tr></thead>
                <tbody>
                  {gwRows.map((r) => (
                    <tr key={r.gw} className={String(r.gw) === String(selectedGw) ? 'selected-gw-row' : ''} onClick={() => setSelectedGw(String(r.gw))}>
                      <td>GW{r.gw}</td><td>{r.played ? 'Yes' : 'No'}</td><td><b>{r.points}</b></td><td>{r.goals}</td><td>{r.assists}</td><td>{r.saves}</td><td>{r.cleanSheet}</td><td>{r.motm}</td><td>{r.penSave}</td><td>{r.penMiss}</td><td>{r.yellow}</td><td>{r.red}</td><td>{r.ownGoal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!gwRows.length && <div className="tf-empty-text" style={{margin:12}}>No gameweek statistics yet.</div>}
          </section>

          <section className="fpl-card">
            <div className="fpl-card-head">Upcoming fixtures</div>
            <div className="fpl-fixture-list">
              {fixtures.map((f) => <div className="fpl-fixture-item" key={f.id || `${f.gw}-${f.opponent}`}><small>GW{f.gw || '—'}</small><div><b>{f.opponent}</b><br/><small>{f.venue}</small></div><small>{f.dateLabel}</small></div>)}
              {!fixtures.length && <div className="tf-empty-text">No upcoming fixtures found.</div>}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function FplStat({ label, value }) {
  return <div className="fpl-stat-card"><span>{label}</span><strong>{value}</strong></div>;
}

function PlayerImageOnly({ player, large = false }) {
  const image = getShirtImage(player);
  if (image) return <img src={image} alt="" />;
  return <div className="tf-shirt-placeholder" style={{ width: large ? 118 : 34, height: large ? 132 : 39, '--shirt-color': player?.color || player?.team_color || '#5866d9' }} />;
}

function WildcardPanel({ wildcards = {}, gw, locked, onToggle, compact = false }) {
  const items = [
    { key:'benchBoost', title:'Bench Boost', desc:'Count the points of all three bench players this Gameweek.' },
    { key:'tripleCaptain', title:'Triple Captain', desc:'Your captain scores triple points instead of double.' },
    { key:'wildcard', title:'Wildcard', desc:'Make unlimited permanent transfers without points deductions.' },
    { key:'freeHit', title:'Free Hit', desc:'Unlimited transfers for one Gameweek, then your old squad returns.' },
  ];

  return (
    <section className={`tf-chips ${compact ? 'compact' : ''}`}>
      <div className="tf-chips-head"><h3>Chips</h3><span>Active chips can be cancelled before the GW locks</span></div>
      <div className="tf-chip-grid">
        {items.map((item) => {
          const usedGw = wildcards?.[item.key];
          const active = Number(usedGw) === Number(gw);
          const usedBefore = Boolean(usedGw) && !active;
          return (
            <div key={item.key} className={`tf-chip-card ${active ? 'active' : ''} ${usedBefore ? 'used' : ''}`}>
              <div className="tf-chip-copy">
                <strong>{item.title}{active ? ' · ACTIVE' : ''}</strong>
                <small>{usedBefore ? `Used in GW ${usedGw}` : active ? `Active in GW ${gw}. Press Cancel to undo it.` : item.desc}</small>
              </div>
              <button
                type="button"
                className="tf-chip-action"
                disabled={locked || usedBefore}
                onClick={() => onToggle(item.key)}
              >
                {usedBefore ? 'Used' : active ? 'Cancel' : 'Activate'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function chipDisplayName(key) {
  return ({ benchBoost:'Bench Boost', tripleCaptain:'Triple Captain', wildcard:'Wildcard', freeHit:'Free Hit' })[key] || key;
}

function TopStat({
  label,
  value,
  budget,
  danger,
}) {
  return (
    <div
      className={`tf-stat ${
        budget ? 'budget' : ''
      } ${danger ? 'danger' : ''}`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SquadSlot({
  player,
  bench = false,
  benchOrder = null,
  isCaptain = false,
  isViceCaptain = false,
  ownership = null,
  gw = null,
  gwPoints = 0,
  selected = false,
  onEmpty,
  onPlayer,
}) {
  if (!player) {
    return (
      <button
        type="button"
        className={`tf-player tf-empty ${
          bench ? 'bench' : ''
        }`}
        onClick={onEmpty}
      >
        {bench && benchOrder && (
          <div className="tf-bench-order">{benchOrder}</div>
        )}

        <div className="tf-price">
          Empty
        </div>

        <div className="tf-shirt">
          +
        </div>

        <div className="tf-name">
          Add Player
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`tf-player ${selected ? 'swap-selected' : ''} ${
        bench ? 'bench' : ''
      }`}
      onClick={() =>
        onPlayer(player)
      }
    >
      {bench && benchOrder && (
        <div className="tf-bench-order">{benchOrder}</div>
      )}

      <div className="tf-price">
        £{fmt(
          getPlayerPrice(player)
        )}
        m
      </div>

      <PlayerShirt
        player={player}
        isCaptain={isCaptain}
        isViceCaptain={isViceCaptain}
      />

      <div className="tf-name">
        {getPlayerName(player)}
      </div>

      <div className="tf-team">
        {getTeamName(player) ||
          getPlayerPosition(
            player
          )}
      </div>

      {gw !== null && (
        <div className="tf-gw-points">GW {gw} · {gwPoints} pts</div>
      )}

      <div className="tf-usage">
        {ownership === null
          ? '— selected'
          : `${ownership}% selected`}
      </div>
    </button>
  );
}

function PlayerShirt({
  player,
  isCaptain,
  isViceCaptain,
}) {
  const image =
    getShirtImage(player);

  return (
    <div className="tf-shirt">
      {image ? (
        <img
          src={image}
          alt=""
        />
      ) : (
        <div
          className="tf-shirt-placeholder"
          style={{
            '--shirt-color':
              player?.color ||
              player?.team_color ||
              '#5866d9',
          }}
        />
      )}

      {isCaptain && (
        <div className="tf-cap">
          C
        </div>
      )}
      {isViceCaptain && !isCaptain && <div className="tf-cap tf-vice">V</div>}
    </div>
  );
}

function normalizeTeam(
  team
) {
  const source = team || {};

  /*
    IMPORTANT:
    The current Fagalla Fantasy
    team schema uses:
      team.starters
      team.bench

    This also migrates the
    temporary starterIds/benchIds
    shape if an older UI saved it.
  */

  let starters =
    Array.isArray(
      source.starters
    )
      ? [...source.starters]
      : Array.isArray(
          source.starterIds
        )
      ? [...source.starterIds]
      : [];

  let bench =
    Array.isArray(
      source.bench
    )
      ? [...source.bench]
      : Array.isArray(
          source.benchIds
        )
      ? [...source.benchIds]
      : [];

  const seen = new Set();

  const clean = (ids) =>
    ids.map((id) => {
      if (
        id === null ||
        id === undefined ||
        id === '' ||
        id === 'null'
      ) {
        return null;
      }

      const key =
        String(id);

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);
      return id;
    });

  starters = clean(
    starters.slice(
      0,
      STARTERS
    )
  );

  bench = clean(
    bench.slice(
      0,
      BENCH
    )
  );

  while (
    starters.length <
    STARTERS
  ) {
    starters.push(null);
  }

  while (
    bench.length <
    BENCH
  ) {
    bench.push(null);
  }

  const captainId =
    starters.some(
      (id) =>
        String(id) ===
        String(
          source.captainId
        )
    )
      ? source.captainId
      : null;

  const viceCaptainId = starters.some((id) => String(id) === String(source.viceCaptainId))
    ? source.viceCaptainId
    : null;

  return {
    ...source,
    starters,
    bench,
    captainId,
    viceCaptainId,
    wildcards: {
      benchBoost: null,
      tripleCaptain: null,
      wildcard: null,
      freeHit: null,
      ...(source.wildcards || {}),
    },

    // Don't keep the wrong
    // temporary shape alive.
    starterIds: undefined,
    benchIds: undefined,
  };
}


function clampFreeTransfers(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(MAX_FREE_TRANSFERS, Math.floor(n)));
}

function makeSquadSnapshot(team) {
  const normalized = normalizeTeam(team);
  return {
    starters: [...normalized.starters],
    bench: [...normalized.bench],
    captainId: normalized.captainId ?? null,
    viceCaptainId: normalized.viceCaptainId ?? null,
  };
}

function cloneSquadSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    starters: Array.isArray(snapshot.starters) ? [...snapshot.starters] : Array(STARTERS).fill(null),
    bench: Array.isArray(snapshot.bench) ? [...snapshot.bench] : Array(BENCH).fill(null),
    captainId: snapshot.captainId ?? null,
    viceCaptainId: snapshot.viceCaptainId ?? null,
  };
}

function cloneTransferState(source, teamForFallback, currentGw) {
  if (!source) return normalizeTransferState(teamForFallback, currentGw);
  return {
    gw: Number(source.gw) || Number(currentGw) || 1,
    freeTransfers: clampFreeTransfers(source.freeTransfers ?? 1),
    freeTransfersAtStart: clampFreeTransfers(source.freeTransfersAtStart ?? source.freeTransfers ?? 1),
    transfersMade: Math.max(0, Number(source.transfersMade) || 0),
    transferCost: Math.max(0, Number(source.transferCost) || 0),
    gwStartTeam: cloneSquadSnapshot(source.gwStartTeam) || makeSquadSnapshot(teamForFallback),
    freeHitSnapshot: cloneSquadSnapshot(source.freeHitSnapshot),
    chipSnapshot: null,
    history: source.history && typeof source.history === 'object' ? JSON.parse(JSON.stringify(source.history)) : {},
  };
}

function cloneChipSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    team: cloneSquadSnapshot(snapshot.team),
    transferState: snapshot.transferState ? cloneTransferState(snapshot.transferState, snapshot.team, snapshot.transferState.gw) : null,
  };
}

function normalizeTransferState(team, currentGw) {
  const source = team?.transferState || {};
  const gw = Number(source.gw) || Number(currentGw) || 1;
  const freeTransfers = clampFreeTransfers(
    source.freeTransfers ?? source.free_transfers ?? 1
  );
  const freeTransfersAtStart = clampFreeTransfers(
    source.freeTransfersAtStart ?? freeTransfers
  );

  return {
    gw,
    freeTransfers,
    freeTransfersAtStart,
    transfersMade: Math.max(0, Number(source.transfersMade) || 0),
    transferCost: Math.max(0, Number(source.transferCost) || 0),
    gwStartTeam: cloneSquadSnapshot(source.gwStartTeam) || makeSquadSnapshot(team),
    freeHitSnapshot: cloneSquadSnapshot(source.freeHitSnapshot),
    chipSnapshot: cloneChipSnapshot(source.chipSnapshot),
    history: source.history && typeof source.history === 'object'
      ? { ...source.history }
      : {},
  };
}

function getTransferState(team, currentGw) {
  return normalizeTransferState(team, currentGw);
}

function syncTeamForGameweek(inputTeam, targetGw) {
  let team = normalizeTeam(inputTeam);
  const target = Math.max(1, Number(targetGw) || 1);
  let ts = normalizeTransferState(team, target);

  // Old teams get transfer metadata without altering the squad.
  if (!team.transferState) {
    ts.gw = target;
    ts.freeTransfers = 1;
    ts.freeTransfersAtStart = 1;
    ts.transfersMade = 0;
    ts.transferCost = 0;
    ts.gwStartTeam = makeSquadSnapshot(team);
    team.transferState = ts;
    return team;
  }

  if (target < ts.gw) {
    // Do not try to reverse historical data if an older GW is viewed temporarily.
    team.transferState = ts;
    return team;
  }

  while (ts.gw < target) {
    const closingGw = ts.gw;
    const wildcardWasActive = Number(team.wildcards?.wildcard) === Number(closingGw);
    const freeHitWasActive = Number(team.wildcards?.freeHit) === Number(closingGw);
    const transferChipWasActive = wildcardWasActive || freeHitWasActive;

    ts.history = {
      ...(ts.history || {}),
      [String(closingGw)]: {
        ...((ts.history || {})[String(closingGw)] || {}),
        transfersMade: ts.transfersMade,
        transferCost: transferChipWasActive ? 0 : ts.transferCost,
        freeTransfersStart: ts.freeTransfersAtStart,
        freeTransfersEnd: ts.freeTransfers,
        chip: wildcardWasActive ? 'wildcard' : freeHitWasActive ? 'freeHit' : null,
        squad: makeSquadSnapshot(team),
      },
    };

    // Free Hit is temporary: restore the squad that existed at the start of that GW.
    if (freeHitWasActive && ts.freeHitSnapshot) {
      const restored = cloneSquadSnapshot(ts.freeHitSnapshot);
      team = normalizeTeam({
        ...team,
        starters: restored.starters,
        bench: restored.bench,
        captainId: restored.captainId,
        viceCaptainId: restored.viceCaptainId,
      });
    }

    // Normal GW: remaining FT + next GW's new FT, capped at five.
    // Wildcard / Free Hit: saved FTs are protected, and the chip consumes that GW's
    // new allowance, so do not add another FT on this transition.
    const nextFreeTransfers = transferChipWasActive
      ? clampFreeTransfers(ts.freeTransfersAtStart)
      : clampFreeTransfers(ts.freeTransfers + 1);

    ts = {
      ...ts,
      gw: closingGw + 1,
      freeTransfers: nextFreeTransfers,
      freeTransfersAtStart: nextFreeTransfers,
      transfersMade: 0,
      transferCost: 0,
      gwStartTeam: makeSquadSnapshot(team),
      freeHitSnapshot: null,
      chipSnapshot: null,
    };
  }

  team.transferState = ts;
  return team;
}

function applyTransferToTeam(team, gw) {
  const currentGw = Number(gw) || 1;
  const ts = normalizeTransferState(team, currentGw);
  const wildcardActive = Number(team.wildcards?.wildcard) === currentGw;
  const freeHitActive = Number(team.wildcards?.freeHit) === currentGw;
  const unlimited = wildcardActive || freeHitActive;

  let extraCost = 0;
  let freeTransfers = ts.freeTransfers;

  if (!unlimited) {
    if (freeTransfers > 0) {
      freeTransfers -= 1;
    } else {
      extraCost = TRANSFER_HIT_POINTS;
    }
  }

  const transferCost = unlimited ? 0 : ts.transferCost + extraCost;
  const transfersMade = ts.transfersMade + 1;

  const nextState = {
    ...ts,
    gw: currentGw,
    freeTransfers,
    transfersMade,
    transferCost,
    history: {
      ...(ts.history || {}),
      [String(currentGw)]: {
        ...((ts.history || {})[String(currentGw)] || {}),
        transfersMade,
        transferCost,
        freeTransfersStart: ts.freeTransfersAtStart,
        freeTransfersEnd: freeTransfers,
        chip: wildcardActive ? 'wildcard' : freeHitActive ? 'freeHit' : null,
      },
    },
  };

  return {
    transferState: nextState,
    extraCost,
    transferCost,
  };
}

async function saveTeamThroughContext(app, nextTeam) {
  if (typeof app?.saveTeam === 'function') {
    await app.saveTeam(nextTeam);
    return;
  }
  if (typeof app?.updateTeam === 'function') {
    await app.updateTeam(nextTeam);
    return;
  }
  if (typeof app?.setTeam === 'function') {
    await app.setTeam(nextTeam);
    return;
  }
  if (typeof app?.persistTeam === 'function') {
    await app.persistTeam(nextTeam);
    return;
  }

  console.warn(
    'No team save function found in AppContext. UI was updated locally only.'
  );
}

function transferRelevantSignature(team) {
  const t = normalizeTeam(team);
  return JSON.stringify({
    starters: t.starters,
    bench: t.bench,
    captainId: t.captainId,
    viceCaptainId: t.viceCaptainId,
    wildcards: t.wildcards,
    transferState: t.transferState || null,
  });
}

function getPlayerById(
  players,
  id
) {
  if (
    id === null ||
    id === undefined
  ) {
    return null;
  }

  return (
    players.find(
      (player) =>
        String(player.id) ===
        String(id)
    ) || null
  );
}

function getPlayerName(
  player
) {
  return (
    player?.name ??
    player?.web_name ??
    player?.short_name ??
    'Player'
  );
}

function getPlayerPrice(
  player
) {
  return Number(
    player?.price ??
      player?.cost ??
      player?.value ??
      0
  );
}

function getPlayerPosition(
  player
) {
  return (
    player?.position ??
    player?.pos ??
    player?.role ??
    'Player'
  );
}

function getTeamName(player) {
  return (
    player?.team_name ??
    player?.teamName ??
    player?.club_name ??
    player?.club ??
    player?.team?.name ??
    ''
  );
}

function getShirtImage(
  player
) {
  return (
    player?.shirt_url ??
    player?.kit_url ??
    player?.jersey_url ??
    player?.team_shirt ??
    player?.photo_url ??
    player?.image_url ??
    player?.image ??
    ''
  );
}

function buildOwnershipMap(
  players,
  accountTeams
) {
  const result = {};

  (players || []).forEach(
    (player) => {
      result[
        String(player.id)
      ] = 0;
    }
  );

  const accounts =
    Array.isArray(accountTeams)
      ? accountTeams
      : [];

  if (!accounts.length) {
    return result;
  }

  const counts = {};

  accounts.forEach((account) => {
    const team =
      normalizeTeam(
        account?.team
      );

    const uniqueIds =
      new Set(
        [
          ...team.starters,
          ...team.bench,
        ]
          .filter(Boolean)
          .map(String)
      );

    uniqueIds.forEach((id) => {
      counts[id] =
        (counts[id] || 0) +
        1;
    });
  });

  Object.keys(result).forEach(
    (id) => {
      result[id] = round1(
        ((counts[id] || 0) /
          accounts.length) *
          100
      );
    }
  );

  return result;
}

function getOwnershipForPlayer(
  ownershipMap,
  player
) {
  if (!player) return null;

  const direct =
    player?.ownership ??
    player?.ownership_percent ??
    player?.selected_by_percent ??
    player?.selectedByPercent;

  if (
    direct !== null &&
    direct !== undefined &&
    direct !== ''
  ) {
    return round1(
      Number(direct)
    );
  }

  const value =
    ownershipMap?.[
      String(player.id)
    ];

  return value === undefined
    ? null
    : round1(value);
}

function updateLocalOwnershipTeam(
  setAccountTeams,
  user,
  nextTeam
) {
  const username =
    typeof user === 'string'
      ? user
      : user?.username ??
        user?.name ??
        null;

  if (!username) return;

  setAccountTeams((current) => {
    const rows =
      Array.isArray(current)
        ? [...current]
        : [];

    const index =
      rows.findIndex(
        (row) =>
          String(row?.username) ===
          String(username)
      );

    if (index >= 0) {
      rows[index] = {
        ...rows[index],
        team: nextTeam,
      };
    } else {
      rows.push({
        username,
        team: nextTeam,
      });
    }

    return rows;
  });
}

function getOwnershipPercent(
  player,
  users
) {
  const direct =
    player?.ownership ??
    player?.ownership_percent ??
    player?.selected_by_percent ??
    player?.selectedByPercent;

  if (
    direct !== null &&
    direct !== undefined &&
    direct !== ''
  ) {
    return round1(
      Number(direct)
    );
  }

  if (!Array.isArray(users)) {
    return null;
  }

  const userTeams =
    users
      .map((entry) => {
        if (
          typeof entry !==
          'object'
        ) {
          return null;
        }

        return (
          entry.team ??
          entry.squad ??
          entry.fantasy_team ??
          null
        );
      })
      .filter(Boolean);

  if (!userTeams.length) {
    return null;
  }

  const owners =
    userTeams.filter(
      (rawTeam) => {
        const t =
          normalizeTeam(
            rawTeam
          );

        return [
          ...t.starters,
          ...t.bench,
        ].some(
          (id) =>
            String(id) ===
            String(
              player.id
            )
        );
      }
    ).length;

  return round1(
    (owners /
      userTeams.length) *
      100
  );
}

function getGwHistory(
  stats,
  playerId
) {
  if (!stats) return [];

  // New row-style stats.
  if (Array.isArray(stats)) {
    return stats
      .filter((row) => {
        const id =
          row.player_id ??
          row.playerId ??
          row.player?.id;

        return (
          String(id) ===
          String(playerId)
        );
      })
      .map((row) => ({
        gw: Number(
          row.gw ??
          row.gameweek ??
          row.gameweek_number ??
          0
        ),
        points:
          pointsFromStat(
            row
          ),
      }))
      .filter(
        (row) => row.gw > 0
      )
      .sort(
        (a, b) =>
          a.gw - b.gw
      );
  }

  // Existing Fagalla Fantasy
  // shape: { gw1: { playerId: stat } }
  if (
    typeof stats ===
    'object'
  ) {
    return Object.entries(
      stats
    )
      .map(
        ([key, gwData]) => {
          const match =
            String(key).match(
              /(\d+)/
            );

          if (!match) {
            return null;
          }

          const gw =
            Number(match[1]);

          const stat =
            gwData?.[
              playerId
            ] ??
            gwData?.[
              String(
                playerId
              )
            ];

          if (
            stat ===
              undefined ||
            stat === null
          ) {
            return {
              gw,
              points: 0,
            };
          }

          return {
            gw,
            points:
              pointsFromStat(
                stat
              ),
          };
        }
      )
      .filter(Boolean)
      .sort(
        (a, b) =>
          a.gw - b.gw
      );
  }

  return [];
}

function pointsFromStat(
  stat
) {
  if (
    typeof stat ===
    'number'
  ) {
    return stat;
  }

  if (!stat) return 0;

  const direct =
    stat.fantasy_points ??
    stat.points ??
    stat.pts ??
    stat.total_points;

  if (
    direct !== undefined &&
    direct !== null
  ) {
    return Number(direct) || 0;
  }

  // Existing app scoring.
  return (
    (Number(stat.goals) ||
      0) *
      5 +
    (Number(stat.assists) ||
      0) *
      3 +
    (Number(stat.saves) ||
      0) *
      1 +
    (stat.cleanSheet ||
    stat.clean_sheet
      ? 6
      : 0) +
    (stat.motm ? 6 : 0) +
    (Number(
      stat.penSave ??
        stat.penalties_saved
    ) ||
      0) *
      3 +
    (Number(
      stat.penMiss ??
        stat.penalties_missed
    ) ||
      0) *
      -2 +
    (Number(
      stat.yellow ??
        stat.yellow_cards
    ) ||
      0) *
      -2 +
    (Number(
      stat.red ??
        stat.red_cards
    ) ||
      0) *
      -6 +
    (Number(
      stat.ownGoal ??
        stat.own_goals
    ) ||
      0) *
      -3 +
    (Number(stat.bonus) ||
      0)
  );
}

function getRawStatRows(stats, playerId) {
  if (!stats) return [];
  if (Array.isArray(stats)) {
    return stats
      .filter((row) => String(row.player_id ?? row.playerId ?? row.player?.id) === String(playerId))
      .map((row) => ({ gw:Number(row.gw ?? row.gameweek ?? row.gameweek_number ?? 0), stat:row }))
      .filter((row) => row.gw > 0)
      .sort((a,b) => a.gw-b.gw);
  }
  if (typeof stats === 'object') {
    return Object.entries(stats)
      .map(([key, gwData]) => {
        const m=String(key).match(/(\d+)/); if(!m) return null;
        const stat=gwData?.[playerId] ?? gwData?.[String(playerId)] ?? null;
        return { gw:Number(m[1]), stat };
      })
      .filter(Boolean)
      .sort((a,b) => a.gw-b.gw);
  }
  return [];
}

function numStat(s, ...keys) {
  for (const k of keys) if (s && s[k] !== undefined && s[k] !== null) return Number(s[k]) || 0;
  return 0;
}
function boolStat(s, ...keys) {
  for (const k of keys) if (s && s[k] !== undefined && s[k] !== null) return Boolean(s[k]);
  return false;
}
function didPlayerPlay(stat) {
  if (!stat) return false;
  if (stat.played !== undefined) return Boolean(stat.played);
  if (stat.appearance !== undefined) return Boolean(stat.appearance);
  if (stat.minutes !== undefined) return Number(stat.minutes) > 0;
  // Backward compatibility: any recorded non-zero action means the player appeared.
  const keys=['goals','assists','saves','cleanSheet','clean_sheet','motm','penSave','penalties_saved','penMiss','penalties_missed','yellow','yellow_cards','red','red_cards','ownGoal','own_goals','points','fantasy_points','pts','total_points'];
  return keys.some((k) => stat[k] !== undefined && (typeof stat[k] === 'boolean' ? stat[k] : Number(stat[k]) !== 0));
}

function getPlayerGwDetailedRows(stats, playerId) {
  return getRawStatRows(stats, playerId).map(({gw,stat}) => ({
    gw,
    played: didPlayerPlay(stat),
    points: pointsFromStat(stat),
    goals: numStat(stat,'goals'),
    assists: numStat(stat,'assists'),
    saves: numStat(stat,'saves'),
    cleanSheet: boolStat(stat,'cleanSheet','clean_sheet') ? 1 : 0,
    motm: boolStat(stat,'motm') ? 1 : 0,
    penSave: numStat(stat,'penSave','penalties_saved'),
    penMiss: numStat(stat,'penMiss','penalties_missed'),
    yellow: numStat(stat,'yellow','yellow_cards'),
    red: numStat(stat,'red','red_cards'),
    ownGoal: numStat(stat,'ownGoal','own_goals'),
  }));
}

function getPlayerGwPoints(stats, playerId, gw) {
  if (!playerId) return 0;
  const row = getPlayerGwDetailedRows(stats, playerId)
    .find((entry) => Number(entry.gw) === Number(gw));
  return row ? row.points : 0;
}

function getPlayerSeasonStats(stats, playerId) {
  const rows=getPlayerGwDetailedRows(stats,playerId);
  const agg={points:0,played:0,goals:0,assists:0,saves:0,cleanSheet:0,motm:0,penSave:0,penMiss:0,yellow:0,red:0,ownGoal:0,form:0,avg:0,bestGw:'—',bestPoints:0};
  rows.forEach((r) => {
    agg.points+=r.points; agg.played+=r.played?1:0; agg.goals+=r.goals; agg.assists+=r.assists; agg.saves+=r.saves;
    agg.cleanSheet+=r.cleanSheet; agg.motm+=r.motm; agg.penSave+=r.penSave; agg.penMiss+=r.penMiss; agg.yellow+=r.yellow; agg.red+=r.red; agg.ownGoal+=r.ownGoal;
    if(r.points>agg.bestPoints || agg.bestGw==='—'){ agg.bestPoints=r.points; agg.bestGw=`GW${r.gw}`; }
  });
  const recent=rows.slice(-3); agg.form=round1(recent.length ? recent.reduce((s,r)=>s+r.points,0)/recent.length : 0);
  agg.avg=round1(agg.played ? agg.points/agg.played : 0);
  return agg;
}

function getNextFixtures(
  player,
  matches,
  currentGw
) {
  if (!Array.isArray(matches)) {
    return [];
  }

  const playerTeamId =
    player?.team_id ??
    player?.teamId ??
    player?.club_id ??
    player?.team?.id;

  const playerTeamName =
    getTeamName(player)
      .trim()
      .toLowerCase();

  return matches
    .map(normalizeMatch)
    .filter((match) => {
      const byId =
        playerTeamId &&
        (String(
          match.homeId
        ) ===
          String(
            playerTeamId
          ) ||
          String(
            match.awayId
          ) ===
            String(
              playerTeamId
            ));

      const home =
        String(
          match.homeName ||
            ''
        ).toLowerCase();

      const away =
        String(
          match.awayName ||
            ''
        ).toLowerCase();

      const byName =
        playerTeamName &&
        (home ===
          playerTeamName ||
          away ===
            playerTeamName);

      if (!byId && !byName) {
        return false;
      }

      if (
        match.finished ||
        match.status ===
          'finished' ||
        match.status ===
          'completed'
      ) {
        return false;
      }

      if (
        match.gw &&
        Number(match.gw) <
          Number(
            currentGw || 0
          )
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (
        a.date &&
        b.date
      ) {
        return (
          new Date(a.date) -
          new Date(b.date)
        );
      }

      return (
        Number(a.gw || 999) -
        Number(b.gw || 999)
      );
    })
    .map((match) => {
      const homeById =
        playerTeamId &&
        String(
          match.homeId
        ) ===
          String(
            playerTeamId
          );

      const homeByName =
        playerTeamName &&
        String(
          match.homeName
        ).toLowerCase() ===
          playerTeamName;

      const isHome =
        homeById ||
        homeByName;

      return {
        ...match,
        opponent: isHome
          ? match.awayName
          : match.homeName,
        venue: isHome
          ? 'Home'
          : 'Away',
        dateLabel:
          formatDate(
            match.date
          ),
      };
    });
}

function normalizeMatch(
  match
) {
  return {
    id: match.id,
    gw:
      match.gw ??
      match.gameweek ??
      match.gameweek_number ??
      match.gameweek?.number ??
      '',
    homeId:
      match.home_team_id ??
      match.homeTeamId ??
      match.home?.id,
    awayId:
      match.away_team_id ??
      match.awayTeamId ??
      match.away?.id,
    homeName:
      match.home_team_name ??
      match.homeTeamName ??
      match.home?.name ??
      match.home_team?.name ??
      match.homeTeam ??
      'Home',
    awayName:
      match.away_team_name ??
      match.awayTeamName ??
      match.away?.name ??
      match.away_team?.name ??
      match.awayTeam ??
      'Away',
    date:
      match.match_date ??
      match.kickoff_time ??
      match.start_time ??
      match.date ??
      null,
    status:
      String(
        match.status || ''
      ).toLowerCase(),
    finished:
      Boolean(
        match.finished ??
        match.completed ??
        match.is_finished ??
        false
      ),
  };
}

function formatDate(date) {
  if (!date) return 'TBC';

  const d = new Date(date);

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {
    return String(date);
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(d);
}

function round1(number) {
  return (
    Math.round(
      Number(number || 0) *
        10
    ) / 10
  );
}

function fmt(number) {
  return round1(number).toString();
}
