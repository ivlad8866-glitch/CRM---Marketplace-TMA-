import { formatVoiceTime } from "../../lib/adapters";

type VoiceRecorderProps = {
  recordingTime: number;
  onCancel: () => void;
};

export default function VoiceRecorder({ recordingTime, onCancel }: VoiceRecorderProps) {
  return (
    <div className="composer composer--recording">
      <div className="recording-bar">
        <span className="recording-bar__dot" />
        <span className="recording-bar__label">
          Запись... {formatVoiceTime(recordingTime)}
        </span>
        <button
          className="recording-bar__cancel"
          type="button"
          onClick={onCancel}
        >
          {"\u2190"} Отмена
        </button>
      </div>
    </div>
  );
}
