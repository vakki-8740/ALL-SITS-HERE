export default function Toast({ toast }) {
  return (
    <div className={'toast' + (toast.type ? ' ' + toast.type : '') + (toast.msg ? ' show' : '')}>
      {toast.msg}
    </div>
  );
}
