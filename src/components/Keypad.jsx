// src/components/Keypad.jsx
const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"];

export default function Keypad({ onKeyPress, onSubmit }) {
  return (
    <div className="grid grid-cols-3 gap-2 w-98 h-98">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          className="p-4 rounded bg-gray-400 text-white hover:bg-gray-600"
        >
          {key}
        </button>
      ))}
      <button
        onClick={onSubmit}
        className="col-span-3 p-4 bg-blue-400 text-white rounded hover:bg-blue-600"
      >
        Submit
      </button>
    </div>
  );
}