import React from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import { GameScreenProps } from '../types';

export const SecondGameScreen: React.FC<GameScreenProps> = ({ onExitToHub }) => {
  return (
    <div className="relative min-h-screen w-full bg-[#061c13] text-[#f5f3ee] flex flex-col justify-between px-6 py-8 sm:px-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        {onExitToHub && (
          <button
            type="button"
            onClick={onExitToHub}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-emerald-700/60 bg-[#082117] text-xs sm:text-sm font-medium text-emerald-100 hover:bg-emerald-900/70 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            게임 목록으로
          </button>
        )}
      </div>

      <div className="my-auto rounded-2xl bg-[#082218]/90 border border-emerald-700/50 p-8 sm:p-10 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-400/10 border border-amber-400/40 text-amber-300 flex items-center justify-center">
          <Layers className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <p className="font-mono-tabular text-xs text-emerald-300/80">GAME 02 · WORKSPACE READY</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            두 번째 게임 슬롯
          </h1>
          <p className="text-sm sm:text-base text-emerald-200/85 max-w-md mx-auto leading-relaxed">
            이 영역은 두 번째 게임을 바로 추가할 수 있도록 독립 폴더 구조로 준비되어 있습니다.
          </p>
        </div>
        {onExitToHub && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onExitToHub}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#1a1304] font-bold text-sm transition-colors cursor-pointer"
            >
              메인 화면으로 돌아가기
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-emerald-300/60">
        새 게임 규칙을 알려주시면 이 슬롯에 바로 구현됩니다.
      </div>
    </div>
  );
};
