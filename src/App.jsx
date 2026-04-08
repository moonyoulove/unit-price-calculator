import { useState, useRef, useEffect } from 'react'
import ItemCard from './components/ItemCard'
import ResultPanel from './components/ResultPanel'
import './index.css' // Global styles

function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('calcAutosaveItems');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { id: crypto.randomUUID(), name: '', image: null, originalPrice: '', currentPrice: '', portions: '1', sizePerPortion: '1', unit: 'g', customMetrics: [] },
      { id: crypto.randomUUID(), name: '', image: null, originalPrice: '', currentPrice: '', portions: '1', sizePerPortion: '1', unit: 'g', customMetrics: [] }
    ];
  })

  // Optional: Global custom metrics definition so that all cards know what extra dimensions exist
  // We can just rely on the first item's metrics as the template, or manage globally.
  // For simplicity, let user add custom metric per item, but we'll try to sync them or just compare by matching names.
  const [globalMetrics, setGlobalMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('calcAutosaveMetrics');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  })
  const [savedMetrics, setSavedMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem('calcSavedMetrics');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore parse errors and fallback to default
    }
    return ['蛋白質', '熱量', '脂肪', '碳水化合物', '糖分', '鈉'];
  });

  const addItem = () => {
    setItems([
      ...items,
      { 
        id: crypto.randomUUID(), 
        name: '', 
        image: null, 
        originalPrice: '', 
        currentPrice: '', 
        portions: '1', 
        sizePerPortion: '1', 
        unit: 'g',
        customMetrics: globalMetrics.map(m => ({ name: m, value: '' })) 
      }
    ])
  }

  const removeItem = (id) => {
    if (items.length <= 2) {
      alert('至少需要比較兩個項目！');
      return;
    }
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, newProps) => {
    setItems(prevItems => prevItems.map(item => item.id === id ? { ...item, ...newProps } : item))
  }

  const addGlobalMetric = (metricName) => {
    if (globalMetrics.includes(metricName) || !metricName.trim()) return;

    if (!savedMetrics.includes(metricName)) {
      const newSaved = [...savedMetrics, metricName];
      setSavedMetrics(newSaved);
      localStorage.setItem('calcSavedMetrics', JSON.stringify(newSaved));
    }

    setGlobalMetrics([...globalMetrics, metricName]);
    // update all items to have this metric if they don't
    setItems(prev => prev.map(item => {
      if (!item.customMetrics.find(m => m.name === metricName)) {
        return { ...item, customMetrics: [...item.customMetrics, { name: metricName, value: '', unit: 'g' }] }
      }
      return item;
    }))
  }

  const removeGlobalMetric = (metricName) => {
    setGlobalMetrics(globalMetrics.filter(m => m !== metricName));
    setItems(prev => prev.map(item => ({
      ...item,
      customMetrics: item.customMetrics.filter(m => m.name !== metricName)
    })));
  }

  const removeSavedMetric = (metricName) => {
    setSavedMetrics(prev => {
      const next = prev.filter(m => m !== metricName);
      localStorage.setItem('calcSavedMetrics', JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    try {
      localStorage.setItem('calcAutosaveItems', JSON.stringify(items));
      localStorage.setItem('calcAutosaveMetrics', JSON.stringify(globalMetrics));
    } catch {
      console.warn("無法自動儲存：可能是圖片過大超過瀏覽器儲存上限");
    }
  }, [items, globalMetrics]);

  const resetAll = () => {
    if (!window.confirm('確定要清除所有比價紀錄並重新開始嗎？')) return;
    setItems([
      { id: crypto.randomUUID(), name: '', image: null, originalPrice: '', currentPrice: '', portions: '1', sizePerPortion: '1', unit: 'g', customMetrics: [] },
      { id: crypto.randomUUID(), name: '', image: null, originalPrice: '', currentPrice: '', portions: '1', sizePerPortion: '1', unit: 'g', customMetrics: [] }
    ]);
    setGlobalMetrics([]);
    localStorage.removeItem('calcAutosaveItems');
    localStorage.removeItem('calcAutosaveMetrics');
  };

  const importFileInputRef = useRef(null);
  const resultPanelRef = useRef(null);

  const exportData = () => {
    const data = { items, globalMetrics };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    a.download = `calc_${timeStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.items) setItems(data.items);
        if (data.globalMetrics) {
          setGlobalMetrics(data.globalMetrics);
          setSavedMetrics(prev => {
            const newSaved = [...prev];
            data.globalMetrics.forEach(gm => {
                if (!newSaved.includes(gm)) newSaved.push(gm);
            });
            localStorage.setItem('calcSavedMetrics', JSON.stringify(newSaved));
            return newSaved;
          });
        }
      } catch {
        alert("匯入失敗：檔案格式不正確");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const appContainerRef = useRef(null);

  return (
    <div ref={appContainerRef} className="app-container animate-fade-in" style={{ width: '100%', maxWidth: '1600px', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, var(--accent), #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            單位價格比價計算機
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>精打細算，找出最划算的選擇！支援貼上圖片或輸入名稱。</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => resultPanelRef.current?.exportToImage()}
            style={{ padding: '0.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="將目前的比價結果產生出一張圖片"
          >
            📸 儲存結果圖案
          </button>
          <button 
            onClick={() => resultPanelRef.current?.exportToMarkdown()}
            style={{ padding: '0.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            title="將排版好的比較報告複製到剪貼簿"
          >
            📋 複製 MD 表格
          </button>
          <button 
            onClick={resetAll}
            style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
            title="清除目前所有商品並重新開始"
          >
            🗑️ 重新開始
          </button>
          <button 
            onClick={() => importFileInputRef.current?.click()}
            style={{ padding: '0.5rem 1rem', background: 'var(--card-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
            title="載入先前的比價紀錄檔案"
          >
            📂 匯入紀錄
          </button>
          <input type="file" ref={importFileInputRef} style={{ display: 'none' }} accept=".json" onChange={importData} />
          <button 
            onClick={exportData}
            style={{ padding: '0.5rem 1rem', background: 'var(--accent)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)' }}
            title="將目前的比價結果儲存為檔案"
          >
            💾 匯出存檔
          </button>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <section className="items-section" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'stretch' }}>
          {items.map((item, index) => (
            <div key={item.id} style={{ width: '320px', flexShrink: 0 }}>
              <ItemCard 
                item={item} 
                index={index} 
                onUpdate={(newProps) => updateItem(item.id, newProps)}
                onRemove={() => removeItem(item.id)}
                onAddMetric={addGlobalMetric}
                onRemoveMetric={removeGlobalMetric}
                onRemoveSavedMetric={removeSavedMetric}
                globalMetrics={globalMetrics}
                savedMetrics={savedMetrics}
              />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button 
              className="add-item-card" 
              onClick={addItem}
              style={{ 
                height: '100%', 
                minHeight: '200px',
                padding: '0 1.5rem',
                border: '2px dashed var(--card-border)',
                background: 'transparent',
                color: 'var(--accent)',
                fontSize: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '16px'
              }}
            >
              <span style={{ fontSize: '2.5rem', lineHeight: '1' }}>+</span>
              <span>新增項目</span>
            </button>
          </div>
        </section>

        <section className="result-section">
          <ResultPanel ref={resultPanelRef} items={items} globalMetrics={globalMetrics} />
        </section>
      </main>
    </div>
  )
}

export default App
