import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Download, Search, Eye, Pencil, Trash2, ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Users } from 'lucide-react';
import { useApp, fmt, statusCls, priorityCls } from '../store.jsx';

export default function Leads() {
  const { data, visibleLeads, updateData, toast, setModal } = useApp();
  const nav = useNavigate();
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', source: '' });
  const [sort, setSort] = useState({ col: 'createdAt', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set());

  const all = visibleLeads();
  const filtered = useMemo(() => {
    let r = all.slice();
    if (filters.search) {
      const q = filters.search.toLowerCase();
      r = r.filter((l) => [l.name, l.phone, l.email, l.projectName].some((v) => String(v || '').toLowerCase().includes(q)));
    }
    if (filters.status) r = r.filter((l) => l.status === filters.status);
    if (filters.priority) r = r.filter((l) => l.priority === filters.priority);
    if (filters.source) r = r.filter((l) => l.source === filters.source);
    r.sort((a, b) => { const va = a[sort.col], vb = b[sort.col]; if (va < vb) return sort.dir === 'asc' ? -1 : 1; if (va > vb) return sort.dir === 'asc' ? 1 : -1; return 0; });
    return r;
  }, [all, filters, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * pageSize, curPage * pageSize);

  const setF = (k, v) => { setFilters({ ...filters, [k]: v }); setPage(1); };
  const setSortCol = (col) => { if (sort.col === col) setSort({ col, dir: sort.dir === 'asc' ? 'desc' : 'asc' }); else setSort({ col, dir: 'asc' }); };
  const sortIcon = (col) => sort.col === col ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} />;

  const toggle = (id, on) => { const s = new Set(selected); if (on) s.add(id); else s.delete(id); setSelected(s); };
  const toggleAll = (on) => { setSelected(on ? new Set(filtered.map((l) => l.id)) : new Set()); };
  const clearFilters = () => { setFilters({ search: '', status: '', priority: '', source: '' }); setPage(1); };
  const hasFilters = filters.search || filters.status || filters.priority || filters.source;

  const bulkDelete = () => {
    if (!selected.size) return;
    setModal({
      title: 'Delete leads?',
      body: <p className="text-muted text-sm">Permanently delete {selected.size} lead{selected.size > 1 ? 's' : ''}? This cannot be undone.</p>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Delete', cls: 'btn-danger', onClick: () => { updateData((d) => { d.leads = d.leads.filter((l) => !selected.has(l.id)); }); setSelected(new Set()); toast('Leads deleted', 'success'); } },
      ],
    });
  };

  const exportCsv = () => {
    if (!filtered.length) { toast('Nothing to export', 'warning'); return; }
    const cols = Object.keys(filtered[0]);
    const csv = [cols.join(',')].concat(filtered.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast(`Exported ${filtered.length} rows`, 'success');
  };

  const deleteOne = (id) => {
    const l = data.leads.find((x) => x.id === id);
    setModal({
      title: 'Delete lead?',
      body: <p className="text-muted text-sm">Permanently delete {l.name}?</p>,
      actions: [
        { label: 'Cancel', cls: 'btn-secondary' },
        { label: 'Delete', cls: 'btn-danger', onClick: () => { updateData((d) => { d.leads = d.leads.filter((x) => x.id !== id); }); toast('Lead deleted', 'success'); } },
      ],
    });
  };

  return (
    <>
      <div className="content-head">
        <div><h1>Leads</h1><p>{total} {total === 1 ? 'lead' : 'leads'} {hasFilters ? 'matching filters' : 'in your pipeline'}.</p></div>
        <div className="row">
          <button className="btn btn-secondary" onClick={() => toast('Import flow opened', 'info')}><Upload size={16} /> Import</button>
          <button className="btn btn-secondary" onClick={exportCsv}><Download size={16} /> Export</button>
          <button className="btn btn-primary" onClick={() => nav('/app/leads/new')}><Plus size={16} /> Add Lead</button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-toolbar">
          <div className="topbar-search">
            <Search size={16} />
            <input value={filters.search} placeholder="Search by name, phone, project…" onChange={(e) => setF('search', e.target.value)} />
          </div>
          <select className="select" style={{ width: 'auto' }} value={filters.status} onChange={(e) => setF('status', e.target.value)}>
            <option value="">All Statuses</option>
            {data.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={filters.priority} onChange={(e) => setF('priority', e.target.value)}>
            <option value="">All Priorities</option>
            {data.priorities.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="select" style={{ width: 'auto' }} value={filters.source} onChange={(e) => setF('source', e.target.value)}>
            <option value="">All Sources</option>
            {data.sources.map((s) => <option key={s}>{s}</option>)}
          </select>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>}
          {selected.size > 0 && (
            <div style={{ marginLeft: 'auto' }} className="row text-sm text-muted">
              <span>{selected.size} selected</span>
              <button className="btn btn-sm btn-danger" onClick={bulkDelete}>Delete</button>
            </div>
          )}
        </div>
        <div className="table-scroll">
          {total === 0 ? (
            <div className="empty-state">
              <div className="icon"><Users size={28} /></div>
              <h3>No leads found</h3>
              <p>Try adjusting filters or add your first lead.</p>
              <button className="btn btn-primary" onClick={() => nav('/app/leads/new')}><Plus size={14} /> Add Lead</button>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={selected.size === total && total > 0} onChange={(e) => toggleAll(e.target.checked)} /></th>
                  <th onClick={() => setSortCol('name')}>Customer {sortIcon('name')}</th>
                  <th onClick={() => setSortCol('phone')}>Phone {sortIcon('phone')}</th>
                  <th onClick={() => setSortCol('projectName')}>Project {sortIcon('projectName')}</th>
                  <th onClick={() => setSortCol('budget')}>Budget {sortIcon('budget')}</th>
                  <th onClick={() => setSortCol('source')}>Source {sortIcon('source')}</th>
                  <th onClick={() => setSortCol('status')}>Status {sortIcon('status')}</th>
                  <th onClick={() => setSortCol('priority')}>Priority {sortIcon('priority')}</th>
                  <th>Agent</th>
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => {
                  const ag = data.users.find((u) => u.id === l.assignedTo);
                  return (
                    <tr key={l.id} className={selected.has(l.id) ? 'selected' : ''}>
                      <td><input type="checkbox" checked={selected.has(l.id)} onChange={(e) => toggle(l.id, e.target.checked)} /></td>
                      <td onClick={() => nav(`/app/leads/${l.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="row">
                          <div className="avatar sm">{fmt.initials(l.name)}</div>
                          <div><div style={{ fontWeight: 600 }}>{l.name}</div><div className="text-xs text-muted">{l.email}</div></div>
                        </div>
                      </td>
                      <td>{l.phone}</td>
                      <td>{l.projectName}</td>
                      <td>{fmt.inr(l.budget)}</td>
                      <td>{l.source}</td>
                      <td><span className={`badge ${statusCls(l.status)}`}>{l.status}</span></td>
                      <td><span className={`badge ${priorityCls(l.priority)}`}>{l.priority}</span></td>
                      <td>{ag ? (
                        <div className="row" style={{ gap: 6 }}>
                          <div className="avatar sm">{ag.avatar || fmt.initials(ag.name)}</div>
                          <span className="text-sm">{ag.name.split(' ')[0]}</span>
                        </div>
                      ) : <span className="text-muted text-xs">Unassigned</span>}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-icon btn-ghost" title="View" onClick={() => nav(`/app/leads/${l.id}`)}><Eye size={14} /></button>
                          <button className="btn-icon btn-ghost" title="Edit" onClick={() => nav(`/app/leads/${l.id}/edit`)}><Pencil size={14} /></button>
                          <button className="btn-icon btn-ghost" title="Delete" onClick={() => deleteOne(l.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {total > 0 && (
          <div className="table-foot">
            <div>Showing {(curPage - 1) * pageSize + 1}–{Math.min(curPage * pageSize, total)} of {total}</div>
            <div className="row">
              <select className="select" style={{ width: 'auto' }} value={pageSize} onChange={(e) => { setPageSize(+e.target.value); setPage(1); }}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-muted">per page</span>
              <div className="pagination">
                <button onClick={() => setPage(1)} disabled={curPage === 1}><ChevronsLeft size={14} /></button>
                <button onClick={() => setPage(curPage - 1)} disabled={curPage === 1}><ChevronLeft size={14} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => Math.abs(p - curPage) <= 2).map((p) => (
                  <button key={p} className={p === curPage ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button onClick={() => setPage(curPage + 1)} disabled={curPage === totalPages}><ChevronRight size={14} /></button>
                <button onClick={() => setPage(totalPages)} disabled={curPage === totalPages}><ChevronsRight size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

