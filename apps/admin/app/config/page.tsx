export const runtime = 'edge';

import ConfigEditor from '../domains/config/ConfigEditor';

export default function ConfigPage() {
  return (
    <>
      <div className="page-header">
        <h1>Config</h1>
      </div>
      <ConfigEditor />
    </>
  );
}
