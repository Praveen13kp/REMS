import { Upload, UploadCloud, Search, Eye, Download, Trash2, FileText, Image, Sheet, File } from 'lucide-react';
import { useApp, fmt, uid } from '../store.jsx';

const ICONS = { pdf: FileText, image: Image, excel: Sheet, doc: FileText };

export default function Files() {
  const { data, updateData, toast, setModal } = useApp();
  const u = data.usage;
  const upload = () => {
    setModal({
      title: 'Upload File',
      body: <div className="dropzone"><UploadCloud size={36} /><p style={{ marginTop: 10, fontWeight: 600 }}>Drop files here or click to browse</p></div>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Upload', cls: 'btn-primary', onClick: () => {
          updateData((d) => { d.files = [{ id: uid('f'), name: 'New_Document_' + Date.now() + '.pdf', size: 524288, type: 'pdf', uploadedBy: 'u_admin', uploadedAt: Date.now() }, ...d.files]; });
          toast('File uploaded', 'success');
        }},
      ],
    });
  };
  const remove = (id) => setModal({
    title: 'Delete file?',
    body: <p className="text-muted text-sm">This cannot be undone.</p>,
    actions: [
      { label: 'Cancel', cls: 'btn-secondary' },
      { label: 'Delete', cls: 'btn-danger', onClick: () => { updateData((d) => { d.files = d.files.filter((f) => f.id !== id); }); toast('File deleted', 'success'); } },
    ],
  });
  return (
    <>
      <div className="content-head"><div><h1>Files</h1><p>{data.files.length} files · {u.storageUsed}GB used of {u.storageLimit}GB.</p></div>
        <button className="btn btn-primary" onClick={upload}><Upload size={16} /> Upload Files</button>
      </div>
      <div className="card mb-4">
        <div className="dropzone" onClick={upload}><UploadCloud size={36} /><p style={{ marginTop: 10, fontWeight: 600 }}>Drop files to upload</p><p className="text-muted text-sm">or click to browse · max 100MB per file · PDF, DOC, XLS, PNG, JPG, MP4</p></div>
      </div>
      <div className="card mb-4">
        <div className="card-title">Storage Usage</div>
        <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ width: u.storageUsed / u.storageLimit * 100 + '%', height: '100%', background: 'linear-gradient(90deg,var(--accent-strong),var(--accent))' }} />
        </div>
        <div className="text-sm text-muted">{u.storageUsed}GB used of {u.storageLimit}GB · {u.storageLimit - u.storageUsed}GB remaining</div>
      </div>
      <div className="table-wrap">
        <div className="table-toolbar"><div className="topbar-search"><Search size={16} /><input placeholder="Search files…" /></div></div>
        <div className="table-scroll">
          <table className="data">
            <thead><tr><th>Name</th><th>Size</th><th>Uploaded By</th><th>Date</th><th /></tr></thead>
            <tbody>
              {data.files.map((f) => {
                const u2 = data.users.find((x) => x.id === f.uploadedBy);
                const Ic = ICONS[f.type] || File;
                return (
                  <tr key={f.id}>
                    <td><div className="row"><div className="kpi-icon kpi-icon-amber" style={{ width: 32, height: 32 }}><Ic size={14} /></div><span style={{ fontWeight: 600 }}>{f.name}</span></div></td>
                    <td>{(f.size / 1024).toFixed(1)} KB</td>
                    <td><div className="row" style={{ gap: 6 }}><div className="avatar sm">{u2?.avatar || '?'}</div><span className="text-sm">{u2?.name}</span></div></td>
                    <td>{fmt.date(f.uploadedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon btn-ghost" onClick={() => toast('Preview opened', 'info')}><Eye size={14} /></button>
                        <button className="btn-icon btn-ghost" onClick={() => toast('Downloaded', 'success')}><Download size={14} /></button>
                        <button className="btn-icon btn-ghost" onClick={() => remove(f.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
