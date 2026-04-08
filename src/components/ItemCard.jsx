import { useState, useRef } from 'react'

export default function ItemCard({ item, index, onUpdate, onRemove, onAddMetric, onRemoveMetric, onRemoveSavedMetric, globalMetrics, savedMetrics }) {
  const [newMetricName, setNewMetricName] = useState('')
  const [isAddingMetric, setIsAddingMetric] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const fileInputRef = useRef(null)

  const handlePaste = (e) => {
    const itemsData = e.clipboardData.items;
    for (let i = 0; i < itemsData.length; i++) {
      if (itemsData[i].type.indexOf('image') !== -1) {
        const file = itemsData[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          onUpdate({ image: event.target.result });
        };
        reader.readAsDataURL(file);
        e.preventDefault();
        break;
      }
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdate({ image: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  const handleMetricValueChange = (metricName, field, val) => {
    const newMetrics = item.customMetrics.map(m => 
      m.name === metricName ? { ...m, [field]: val } : m
    );
    // If the item doesn't have this metric yet, add it
    if (!newMetrics.find(m => m.name === metricName)) {
      newMetrics.push({ name: metricName, value: field === 'value' ? val : '', unit: field === 'unit' ? val : 'g' });
    }
    onUpdate({ customMetrics: newMetrics });
  }

  const handleAddMetricSubmit = (e) => {
    if (e.key === 'Enter') {
      const name = newMetricName.trim();
      if (name) {
        onAddMetric(name);
        setNewMetricName('');
        setIsAddingMetric(false);
      }
    }
  }

  return (
    <div className="glass-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>項目 {String.fromCharCode(65 + index)}</h3>
        <button 
          onClick={onRemove} 
          style={{ background: 'transparent', color: 'var(--danger)', padding: '0.25rem 0.5rem', boxShadow: 'none' }}
          title="移除"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div 
          style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '8px', 
            background: 'var(--input-bg)',
            border: '1px dashed var(--input-border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            cursor: 'pointer',
            flexShrink: 0
          }}
          onClick={() => fileInputRef.current?.click()}
          title="點擊上傳或在右側輸入框貼上(Ctrl+V)圖片"
        >
          {item.image ? (
            <img src={item.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>🖼️</span>
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange}
        />
        
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
            名稱或貼上截圖 (Ctrl+V)
          </label>
          <input 
            type="text" 
            placeholder="例如：全聯鮮奶" 
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onPaste={handlePaste}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>目前價格</label>
          <input 
            type="number" 
            min="0" step="any"
            placeholder="$" 
            value={item.currentPrice}
            onChange={(e) => onUpdate({ currentPrice: e.target.value })}
            style={{ color: 'var(--accent)' }}
          />
        </div>
        <div style={{ opacity: item.originalPrice ? 1 : 0.5, transition: 'opacity 0.2s' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>原價 (選填)</label>
          <input 
            type="number" 
            min="0" step="any"
            placeholder="$" 
            value={item.originalPrice}
            onChange={(e) => onUpdate({ originalPrice: e.target.value })}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>份數</label>
          <input 
            type="number" 
            min="1" step="any"
            value={item.portions}
            onChange={(e) => onUpdate({ portions: e.target.value })}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>每份數量</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="number" 
              min="0.001" step="any"
              value={item.sizePerPortion}
              onChange={(e) => onUpdate({ sizePerPortion: e.target.value })}
              style={{ minWidth: 0, flex: 1 }}
            />
            <select 
              value={item.unit || 'g'} 
              onChange={(e) => onUpdate({ unit: e.target.value })}
              style={{ width: 'auto', flexShrink: 0, paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="L">L</option>
              <option value="個">個</option>
              <option value="片">片</option>
              <option value="包">包</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)' }}>自訂維度 (每份)</h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => { setIsManaging(!isManaging); setIsAddingMetric(false); }} 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--input-border)' }}
            >
              ⚙ 管理
            </button>
            <button 
              onClick={() => { setIsAddingMetric(!isAddingMetric); setIsManaging(false); }} 
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--card-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
            >
              {isAddingMetric ? '取消' : '+ 新增'}
            </button>
          </div>
        </div>

        {globalMetrics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {globalMetrics.map((gm) => {
              const valObj = item.customMetrics.find(m => m.name === gm);
              const val = valObj ? valObj.value : '';
              const unitVal = valObj?.unit || 'g';
              return (
                <div key={gm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '70px', flexShrink: 0, gap: '0.25rem' }}>
                    <button 
                      onClick={() => onRemoveMetric(gm)}
                      style={{ padding: '0', background: 'transparent', color: 'var(--danger)', fontSize: '1rem', lineHeight: 1, opacity: 0.6, width: '16px', boxShadow: 'none' }}
                      title="刪除此維度"
                    >×</button>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={gm}>
                      {gm}
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                    <input 
                      type="number" 
                      min="0" step="any"
                      value={val}
                      onChange={(e) => handleMetricValueChange(gm, 'value', e.target.value)}
                      style={{ minWidth: 0, flex: 1 }}
                    />
                    <select 
                      value={unitVal} 
                      onChange={(e) => handleMetricValueChange(gm, 'unit', e.target.value)}
                      style={{ width: 'auto', flexShrink: 0, paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                      <option value="個">個</option>
                      <option value="片">片</option>
                      <option value="包">包</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {isAddingMetric && (
          <div className="animate-fade-in" style={{ marginTop: '0.5rem' }}>
            <input 
              type="text" 
              list={`metrics-list-${index}`}
              placeholder="輸入維度並按 Enter (如: 蛋白質)" 
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              onKeyDown={handleAddMetricSubmit}
              autoFocus
            />
            <datalist id={`metrics-list-${index}`}>
              {savedMetrics?.map(sm => (
                <option key={sm} value={sm} />
              ))}
            </datalist>
          </div>
        )}

        {isManaging && (
          <div className="animate-fade-in" style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--input-border)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>管理推薦清單</div>
            {savedMetrics?.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>無儲存的維度</div> : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {savedMetrics?.map(sm => (
                 <span key={sm} style={{ fontSize: '0.8rem', background: 'var(--bg-color)', border: '1px solid var(--input-border)', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                   {sm}
                   <span style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 'bold' }} onClick={() => onRemoveSavedMetric(sm)} title="從清單中刪除">×</span>
                 </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
