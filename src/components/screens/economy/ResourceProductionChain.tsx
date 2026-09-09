import { useState } from 'react';
import { bridgeCall, type GetEconomyResourceDetailsResponse } from '../../../bridge-types.generated';
import { acknowledgeBridgeFailure } from '../../../bridge/core/runtimeEngine';
import { useGameActions } from '../../../context/GameContext';
import { useResourceDetails } from '../../../context/ResourceDetailsContext';
import { useWebUIText } from '../../../localization/WebUITextContext';
import { formatResourceNumber } from '../../../utils/numberFormat';
import ResourceRecipeDiagram from './ResourceRecipeDiagram';
import GameButton from '../../common/buttons/GameButton';
import Tooltip from '../../common/tooltips/Tooltip';
import './ResourceProductionChain.css';

interface Props {
  details: GetEconomyResourceDetailsResponse;
  onSelectResource: (id: string) => void;
}

export default function ResourceProductionChain({ details, onSelectResource }: Props) {
  const t = useWebUIText();
  const { closeScreen, openSidebar } = useGameActions();
  const { closeResource } = useResourceDetails();
  const [expandedBuilding, setExpandedBuilding] = useState<string | null>(null);
  const [showWorkshops, setShowWorkshops] = useState(false);
  const [expandedWorkshops, setExpandedWorkshops] = useState<Set<string>>(() => new Set());
  const limitingNames = [...new Set(details.workshops.flatMap(workshop => (
    workshop.inputs.filter(input => input.limiting).map(input => input.name)
  )))];
  const workshops = expandedBuilding === null
    ? details.workshops
    : details.workshops.filter(workshop => workshop.buildingName === expandedBuilding);

  if (details.recipes.length === 0) return null;

  const showOnMap = (resourceId: string) => {
    bridgeCall('game.show_resource_on_map', { resourceId }).catch(acknowledgeBridgeFailure);
    closeResource();
    closeScreen();
  };

  return (
    <section className="erp-chain">
      <h3>{t('Economy.ProductionChain')}</h3>
      <div className="erp-recipes">
        {details.recipes.map((recipe, index) => (
          <ResourceRecipeDiagram
            key={`${recipe.buildingName}:${index}`}
            recipe={recipe}
            resourceId={details.resourceId}
            expanded={showWorkshops && expandedBuilding === recipe.buildingName}
            onSelectResource={onSelectResource}
            onSelectBuilding={() => {
              setShowWorkshops(!showWorkshops || expandedBuilding !== recipe.buildingName);
              setExpandedBuilding(recipe.buildingName);
            }}
          />
        ))}
      </div>
      {details.lostProduction > 0 && (
        <button
          type="button"
          className="erp-shortage"
          aria-expanded={showWorkshops && expandedBuilding === null}
          onClick={() => {
            setShowWorkshops(!showWorkshops || expandedBuilding !== null);
            setExpandedBuilding(null);
          }}
        >
          <span>
            <strong>{t('Economy.ProductionInputShortage', { Resource: details.name, Inputs: limitingNames.join(', ') })}</strong>
            <span>{t('Economy.ProductionLostToInputs', { Amount: formatResourceNumber(details.lostProduction), Resource: details.name })}</span>
          </span>
          <span className="erp-shortage__action">{t(showWorkshops && expandedBuilding === null ? 'Economy.HideWorkshops' : 'Economy.ViewWorkshops')}</span>
        </button>
      )}
      {showWorkshops && (
        <div className="erp-workshops">
          {workshops.length === 0 ? <p className="erp-muted">{t('Economy.NoWorkshopsBuilt')}</p> : (
            <>
              <div className="erp-workshop-heading" aria-hidden="true">
                <span>{t('Economy.Workshop')}</span>
                <span>{t('Economy.WorkshopMonthlyOutput')}</span>
                <span>{t('Economy.WorkshopSupplies')}</span>
              </div>
              {workshops.map((workshop, index) => {
                const key = `${workshop.settlementId}:${workshop.buildingName}:${index}`;
                const expanded = expandedWorkshops.has(key);
                const missing = workshop.inputs.filter(input => input.limiting).map(input => input.name);
                return (
                  <div className="erp-workshop" key={key}>
                    <div className="erp-workshop__summary">
                      <div className="erp-workshop__place">
                        <GameButton variant="outline" className="erp-button" onClick={() => {
                          closeResource();
                          closeScreen();
                          openSidebar('settlement', workshop.settlementId);
                        }}>{workshop.settlementName}</GameButton>
                        <span>{workshop.buildingName}</span>
                      </div>
                      <strong className={missing.length > 0 ? 'erp-warning' : 'erp-output'}>
                        {t('Economy.WorkshopOutputOfPotential', { Amount: formatResourceNumber(workshop.amount), Potential: formatResourceNumber(workshop.potentialAmount) })}
                      </strong>
                      {workshop.inputs.length > 0 ? (
                        <button
                          type="button"
                          className={`erp-input-toggle${missing.length > 0 ? ' erp-warning' : ''}`}
                          aria-expanded={expanded}
                          onClick={() => setExpandedWorkshops(current => {
                            const next = new Set(current);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })}
                        >
                          <span>{missing.length > 0 ? t('Economy.ShortOfInputs', { Inputs: missing.join(', ') }) : t('Economy.FullySupplied')}</span>
                          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                        </button>
                      ) : <span className="erp-muted">{t('Economy.NaturalProduction')}</span>}
                    </div>
                    {expanded && (
                      <div className="erp-inputs">
                        <p>{t('Economy.WorkshopDailySupplies')}</p>
                        <table>
                          <thead><tr>
                            <th scope="col">{t('Economy.Resource')}</th>
                            <th scope="col">{t('Economy.WorkshopAvailable')}</th>
                            <th scope="col">{t('Economy.WorkshopRequired')}</th>
                            <th scope="col">{t('Economy.WorkshopMissing')}</th>
                            <th scope="col"><span className="erp-visually-hidden">{t('Economy.ShowOnMap')}</span></th>
                          </tr></thead>
                          <tbody>{workshop.inputs.map(input => (
                            <tr key={input.id}>
                              <th scope="row">
                                <GameButton variant="outline" className="erp-button" onClick={() => onSelectResource(input.id)}>{input.name}</GameButton>
                                {input.limiting && <span className="erp-warning erp-input-limit">{t('Economy.LimitsProduction')}</span>}
                              </th>
                              <td>{formatResourceNumber(input.availablePerDay)}</td>
                              <td>{formatResourceNumber(input.requiredPerDay)}</td>
                              <td className={input.missingPerDay > 0 ? 'erp-warning' : ''}>{formatResourceNumber(input.missingPerDay)}</td>
                              <td>
                                <Tooltip content={{ title: input.name, body: t('Economy.ResourceTransportMapTooltip') }}>
                                  <GameButton variant="outline" className="erp-button" onClick={() => showOnMap(input.id)}>{t('Economy.ShowOnMap')}</GameButton>
                                </Tooltip>
                              </td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </section>
  );
}
