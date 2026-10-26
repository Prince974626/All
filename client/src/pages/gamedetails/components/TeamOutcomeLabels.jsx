import { FaArrowRight } from 'react-icons/fa';

export default function TeamOutcomeLabels({
  team,
  selectedBet,
  getBetDetails,
  getProjectedNetOutcome,
  isSelectedBetInMarket,
}) {
  const {
    otype,
    totalBetAmount,
    totalPrice,
    teamName,
    isHedged,
    netOutcome,
  } = getBetDetails(team);
  const isMatchedTeam = teamName?.toLowerCase() === team?.toLowerCase();
  const existingBet =
    isHedged ||
    (otype && totalBetAmount) ||
    (totalPrice && teamName && isMatchedTeam);

  if (isSelectedBetInMarket(selectedBet) && selectedBet?.stake) {
    const projectedNet = getProjectedNetOutcome(team, selectedBet);
    const suggestionValue = projectedNet;
    const suggestionColor =
      projectedNet === null ? 'green' : projectedNet >= 0 ? 'green' : 'red';

    if (existingBet) {
      let betColor;
      let displayValue;

      if (isHedged && netOutcome !== null) {
        displayValue = netOutcome;
        betColor = netOutcome >= 0 ? 'green' : 'red';
      } else {
        betColor =
          otype === 'lay'
            ? isMatchedTeam
              ? 'red'
              : 'green'
            : otype === 'back'
              ? isMatchedTeam
                ? 'green'
                : 'red'
              : 'green';

        displayValue = (() => {
          if (otype === 'lay') {
            return isMatchedTeam ? totalPrice : totalBetAmount;
          }
          if (otype === 'back') {
            return isMatchedTeam ? totalBetAmount : totalPrice;
          }
          return '';
        })();
      }

      return (
        <div className='flex gap-1' style={{ color: betColor }}>
          {displayValue !== '' &&
            displayValue !== null &&
            displayValue !== undefined && (
              <span className='flex items-center gap-0.5 text-[11px]'>
                <FaArrowRight />
                {parseFloat(displayValue).toFixed(2)}
              </span>
            )}
          {suggestionValue !== null && (
            <span style={{ color: suggestionColor }} className='text-[11px]'>
              ({parseFloat(suggestionValue).toFixed(2)})
            </span>
          )}
        </div>
      );
    }

    if (suggestionValue !== null) {
      return (
        <span style={{ color: suggestionColor }} className='text-[11px]'>
          ({parseFloat(suggestionValue).toFixed(2)})
        </span>
      );
    }
  } else if (existingBet) {
    let betColor;
    let displayValue;

    if (isHedged && netOutcome !== null) {
      displayValue = netOutcome;
      betColor = netOutcome >= 0 ? 'green' : 'red';
    } else {
      betColor =
        otype === 'lay'
          ? isMatchedTeam
            ? 'red'
            : 'green'
          : otype === 'back'
            ? isMatchedTeam
              ? 'green'
              : 'red'
            : 'green';

      displayValue = (() => {
        if (otype === 'lay') {
          return isMatchedTeam ? totalPrice : totalBetAmount;
        }
        if (otype === 'back') {
          return isMatchedTeam ? totalBetAmount : totalPrice;
        }
        return '';
      })();
    }

    return (
      <div className='flex gap-1' style={{ color: betColor }}>
        {displayValue !== '' &&
          displayValue !== null &&
          displayValue !== undefined && (
            <span className='flex items-center gap-0.5 text-[11px]'>
              <FaArrowRight />
              {parseFloat(displayValue).toFixed(2)}
            </span>
          )}
      </div>
    );
  }

  return null;
}
