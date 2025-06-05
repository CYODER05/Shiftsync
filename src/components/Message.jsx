// src/components/Message.jsx
export default function Message({ text }) {
  return text ? <div className="message flex justify-center items-center rounded-md border-1 border-green-600 bg-[#deffde] w-[250px] h-[50px]">{text}</div> : <div className="h-[50px]"></div>;
}
