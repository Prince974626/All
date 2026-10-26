import React, { memo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { QUICK_AMOUNTS } from '../constants';
import { formatToK } from '../utils/bettingUtils';

/**
 * BetControlPanel - Sidebar bet slip for casino games
 */
const BetControlPanelMob = memo(function BetControlPanel({
  betControl,
  betOdds,
  setBetOdds,
  betAmount,
  updateAmount,
  loading,
  onCancel,
  onPlaceBet,
  rangeLabel,
  isVisible = true,
}) {
  const { userInfo } = useSelector((state) => state.auth);
  const amounts = (() => {
    const saved = userInfo?.casinoQuickStakes;
    if (!saved?.length) return QUICK_AMOUNTS;
    return QUICK_AMOUNTS.map((def, i) => {
      const item = saved[i];
      if (!item) return def;
      if (typeof item === 'object' && item.label && item.value) {
        return { amt: item.value, label: item.label, img: def.img };
      }
      if (typeof item === 'number' && item > 0) {
        return { amt: item, label: def.label, img: def.img };
      }
      return def;
    });
  })();

  const [selectedIncrement, setSelectedIncrement] = useState(amounts[0].amt);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isVisible || !betControl) return null;

  const minAmount = betControl?.min ?? 100;
  const maxAmount = betControl?.max || 100000;
  const oddsValue = betOdds || betControl?.odds || 1.01;
  const stake = Number(betAmount) || 0;
  const profit =
    betControl?.type === 'lay' ? stake : Math.max(0, stake * (oddsValue - 1));
  const selectedCardCount = String(
    betControl?.card || betControl?.fancyScore || ''
  )
    .split(',')
    .filter(Boolean).length;
  const needsMoreCards =
    betControl?.requiredCardCount &&
    selectedCardCount !== betControl.requiredCardCount;

  const handlePlaceBet = async () => {
    if (loading || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const betType = betControl?.type;
      let teamName = betControl?.nat;
      let subtype = '';

      if (betControl?.requiredCardCount) {
        if (selectedCardCount !== betControl.requiredCardCount) {
          toast.error(
            `Please select exactly ${betControl.requiredCardCount} cards to place bet`
          );
          return;
        }
      }

      if (betControl?.subtype === 'poker20') {
        const suffix = betControl?.sid >= 11 && betControl?.sid <= 19 ? 'A' : 'B';
        teamName = `${betControl?.nat}#${suffix}`;
        subtype = `${betControl?.nat} ${suffix}`;
      }

      await onPlaceBet(
        betType,
        teamName,
        maxAmount,
        oddsValue,
        subtype,
        minAmount,
        betControl?.marketName,
        betControl?.teamCount
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const rowBg = betControl?.type === 'back' ? 'bg-[#beddf4]' : 'bg-[#f3dce2]';

  return (
      <div className="modal-body">
        <div className={`place-bet-modal ${betControl?.type === 'back' ? 'back' : 'lay'}`}>
            <div className="row row5">
                <div className="col-6"><b>{betControl?.nat}</b></div>
                <div className="col-6 text-end">
                  <span>Profit: {stake > 0 ? profit.toFixed(0) : ''}</span>
              </div>
            </div>
            <div className="odd-stake-box">
                <div className="row row5 mt-1">
                    <div className="col-6 text-center">Odds</div>
                    <div className="col-6 text-center">Amount</div>
                </div>
                <div className="row row5 mt-1">
                    <div className="col-6">
                        <input type="text" className="stakeinput w-100" 
                            disabled 
                            value={Number(oddsValue).toFixed(2)}
                            readOnly/>
                    </div>
                    <div className="col-6">
                        <input 
                          type='number'
                          value={betAmount || ''}
                          onChange={(e) => updateAmount(parseInt(e.target.value, 10) || 0)} 
                          className="stakeinput w-100" 
                          placeholder='0'
                          />
                    </div>
                </div>
            </div>
            <div className="place-bet-buttons mt-1">
                {amounts.slice(0, 6).map((val) => (
                  <button
                    key={val.amt}
                    onClick={() => {
                      setSelectedIncrement(val.amt);
                      updateAmount((betAmount || 0) + val.amt);
                    }}
                    className='btn btn-place-bet'
                  >
                      +{val.label || formatToK(val.amt) || val.amt}
                  </button>
                ))}
            </div>
            <div className="mt-1 place-bet-btn-box">
                <button className="btn btn-link" onClick={() => updateAmount(0)}>Clear</button>
                <button className="btn btn-info">Edit</button>
                <button className="btn btn-danger" onClick={onCancel}>Reset</button>
                <button className="btn btn-success" 
                  onClick={handlePlaceBet}
                  disabled={loading}
                  
                  >
                    {loading || isSubmitting ? '...' : 'Submit'}
                </button>
            </div>
            <p className='pt-1'>{rangeLabel}</p>
        </div>
        
      </div>
  );
});

export default BetControlPanelMob;
