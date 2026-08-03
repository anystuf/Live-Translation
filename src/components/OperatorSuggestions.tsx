import { memo } from 'react';

const OperatorSuggestions = memo(function OperatorSuggestions({
  suggestions,
  onAction,
}: {
  suggestions: Array<{
    id: string;
    entryId: string;
    captionId: string;
    original: string;
    proposedReplacement: string;
    confidenceScore: number;
  }>;
  onAction(suggestionId: string, action: 'apply' | 'ignore' | 'always-apply'): void;
}) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="operator-suggestions" aria-live="polite">
      <h4>Terminology suggestions</h4>
      <ul>
        {suggestions.map((s) => (
          <li key={s.id} className="suggestion-item">
            <div className="suggestion-text">
              <strong>{s.original}</strong> → <em>{s.proposedReplacement}</em>
              <span className="confidence"> ({Math.round(s.confidenceScore)})</span>
            </div>
            <div className="suggestion-actions">
              <button onClick={() => onAction(s.id, 'apply')}>Apply</button>
              <button onClick={() => onAction(s.id, 'ignore')}>Ignore</button>
              <button onClick={() => onAction(s.id, 'always-apply')}>Always for session</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default OperatorSuggestions;
