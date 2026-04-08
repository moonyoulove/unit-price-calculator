import { useState, useMemo, forwardRef, useImperativeHandle, useCallback } from 'react'

const ResultPanel = forwardRef(({ items, globalMetrics }, ref) => {
  const [compareBase, setCompareBase] = useState('size')
  const [useOriginalPrice, setUseOriginalPrice] = useState(false)

  const isValidItem = (item) => {
    return Number(item.currentPrice) > 0 && 
           Number(item.portions) > 0 && 
           Number(item.sizePerPortion) > 0
  }

  const validItems = useMemo(() => items.filter(isValidItem), [items])

  const calcInfo = useMemo(() => {
    return validItems.map(item => {
      const priceToUse = useOriginalPrice && item.originalPrice ? Number(item.originalPrice) : Number(item.currentPrice)
      const totalPortions = Number(item.portions)
      
      let totalAmount = 1; // denominator
      let baseName = '';
      let unitName = '';

      if (compareBase === 'quantity') {
        totalAmount = totalPortions;
        baseName = '每份價格';
        unitName = '份';
      } else if (compareBase === 'size') {
        let mult = 1;
        let baseU = item.unit || 'g';
        if (baseU === 'kg') { mult = 1000; baseU = 'g'; }
        if (baseU === 'L') { mult = 1000; baseU = 'ml'; }

        totalAmount = totalPortions * Number(item.sizePerPortion) * mult;
        baseName = `每 ${baseU} 價格`;
        unitName = baseU;
      } else {
        // Custom metric
        const metric = item.customMetrics?.find(m => m.name === compareBase)
        const metricVal = metric ? Number(metric.value) : 0
        let mult = 1;
        let baseU = metric?.unit || 'g';
        if (baseU === 'kg') { mult = 1000; baseU = 'g'; }
        if (baseU === 'L') { mult = 1000; baseU = 'ml'; }
        
        totalAmount = totalPortions * metricVal * mult;
        baseName = `每 ${baseU} ${compareBase} 價格`;
        unitName = `${baseU} ${compareBase}`;
      }

      const unitPrice = totalAmount > 0 ? priceToUse / totalAmount : Infinity;
      const itemName = item.name.trim() || `項目 ${String.fromCharCode(65 + items.findIndex(i => i.id === item.id))}`

      return {
        ...item,
        priceToUse,
        totalAmount,
        unitPrice,
        baseName,
        unitName,
        itemName
      }
    }).sort((a, b) => a.unitPrice - b.unitPrice)
  }, [validItems, compareBase, useOriginalPrice, items])

  const exportToMarkdown = useCallback(() => {
    if (calcInfo.length < 2 || calcInfo[0].unitPrice === Infinity) {
        alert("目前還沒有足夠的資料可以匯出喔！");
        return;
    }

    let markdown = `| 排名 | 項目名稱 | 總計花費 | 總計數量 | ${calcInfo[0].baseName} |\n`;
    markdown += `| :---: | :--- | :--- | :--- | :--- |\n`;
    
    calcInfo.forEach((info, idx) => {
        const rank = idx === 0 ? '🏆 1' : `${idx + 1}`;
        const priceStr = `$${info.priceToUse} ${useOriginalPrice ? '(原價)' : ''}`;
        const amountStr = `${info.totalAmount} ${info.unitName}`;
        const unitPriceStr = `**$${info.unitPrice.toFixed(4)}**`;
        markdown += `| ${rank} | **${info.itemName}** | ${priceStr} | ${amountStr} | ${unitPriceStr} |\n`;
    });

    navigator.clipboard.writeText(markdown).then(() => {
        alert("✅ 已複製 Markdown 表格到剪貼簿！");
    }).catch(err => {
        console.error("複製失敗: ", err);
        alert("複製失敗，請確認瀏覽器權限。");
    });
  }, [calcInfo, useOriginalPrice]);

  const exportToImage = useCallback(() => {
    if (calcInfo.length < 2 || calcInfo[0].unitPrice === Infinity) {
        alert("資料不足，無法產出圖片");
        return;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const width = 800;
    const height = 220 + calcInfo.length * 90;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 36px 'segoe ui', sans-serif";
    ctx.fillText("🏆 單位價格比價結果", 40, 70);

    // Subtitle
    ctx.font = "20px 'segoe ui', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`比較基準: ${calcInfo[0].baseName} ${useOriginalPrice ? '(使用原價)' : ''}`, 40, 110);

    let y = 170;
    calcInfo.forEach((info, idx) => {
        const isBest = idx === 0;
        
        // Card Background
        ctx.fillStyle = isBest ? "#ecfdf5" : "#ffffff";
        ctx.beginPath();
        ctx.roundRect(40, y - 40, width - 80, 80, 12); // Fallback for roundRect might be needed in older browsers, but mostly ok today
        ctx.fill();
        ctx.strokeStyle = isBest ? "#10b981" : "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Item Rank and Name
        ctx.fillStyle = isBest ? "#065f46" : "#334155";
        ctx.font = "bold 24px 'segoe ui', sans-serif";
        ctx.fillText(`${isBest ? '👑 1' : idx + 1}. ${info.itemName}`, 65, y + 10);

        // Details (Price & Amount)
        ctx.font = "18px 'segoe ui', sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "right";
        ctx.fillText(`總花費 $${info.priceToUse} / 總量 ${info.totalAmount.toFixed(1)}${info.unitName}`, width - 250, y + 10);

        // Unit Price
        ctx.fillStyle = isBest ? "#10b981" : "#0f172a";
        ctx.font = isBest ? "bold 28px 'segoe ui', sans-serif" : "bold 24px 'segoe ui', sans-serif";
        ctx.fillText(`$${info.unitPrice.toFixed(4)}`, width - 65, y + 10);
        ctx.textAlign = "left";

        y += 90;
    });

    try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        a.download = `calc_result_${timeStr}.png`;
        a.click();
    } catch(err) {
        console.error("生成圖片錯誤", err);
        alert("產生圖片失敗！");
    }
  }, [calcInfo, useOriginalPrice]);

  useImperativeHandle(ref, () => ({
    exportToMarkdown,
    exportToImage
  }), [exportToMarkdown, exportToImage]);

  if (validItems.length < 2) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        請至少輸入兩個項目的完整資訊 (價格、份數、每份數量) 以進行比較
      </div>
    )
  }

  const cheapest = calcInfo[0]
  const secondCheapest = calcInfo.length > 1 ? calcInfo[1] : null
  const mostExpensive = calcInfo[calcInfo.length - 1]

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.8rem' }}>🏆</span> 分析結果
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontWeight: 'bold' }}>比價基準：</label>
          <select 
            value={compareBase} 
            onChange={(e) => setCompareBase(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="size">總數量 (份數 × 每份數量)</option>
            <option value="quantity">總份數</option>
            {globalMetrics.map(gm => (
              <option key={gm} value={gm}>按 "{gm}" 比較</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={useOriginalPrice} 
              onChange={(e) => setUseOriginalPrice(e.target.checked)} 
              style={{ width: 'auto' }}
            />
            以原價基準計算
          </label>
        </div>
      </div>

      {calcInfo[0].unitPrice === Infinity ? (
        <div style={{ color: 'var(--danger)' }}>選擇的基準資料不足，無法計算。</div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>最佳選擇：{cheapest.itemName}</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              ${cheapest.unitPrice.toFixed(4)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/ {cheapest.unitName}</span>
            </div>
            
            {calcInfo.length > 1 && secondCheapest.unitPrice !== Infinity && (
               <p style={{ margin: 0, color: 'var(--text-primary)' }}>
                 比次便宜的 <strong>{secondCheapest.itemName}</strong> 每單位節省 
                 <strong style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>${(secondCheapest.unitPrice - cheapest.unitPrice).toFixed(4)}</strong>
               </p>
            )}
          </div>

          <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--card-border)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>交叉比較：如果拿最貴的錢來買最便宜的...</h3>
            {mostExpensive.id !== cheapest.id && mostExpensive.totalAmount > 0 ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <li>
                  若要取得與 <strong style={{ color: 'var(--danger)' }}>{mostExpensive.itemName}</strong> 相同的總量 ({mostExpensive.totalAmount.toFixed(2)} {mostExpensive.unitName})，
                  買 <strong>{cheapest.itemName}</strong> 只要 <strong style={{ color: 'var(--success)' }}>${(mostExpensive.totalAmount * cheapest.unitPrice).toFixed(1)}</strong>
                  （省下 ${(mostExpensive.priceToUse - (mostExpensive.totalAmount * cheapest.unitPrice)).toFixed(1)}）
                </li>
                <li style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.8rem' }}>
                  拿原本買 <strong>{mostExpensive.itemName}</strong> 的預算 (${mostExpensive.priceToUse})，
                  可以買到 <strong>{cheapest.itemName}</strong> 總共 <strong style={{ color: 'var(--accent)' }}>{(mostExpensive.priceToUse / cheapest.unitPrice).toFixed(2)}</strong> {cheapest.unitName}
                  （多了 {((mostExpensive.priceToUse / cheapest.unitPrice) - mostExpensive.totalAmount).toFixed(2)} {cheapest.unitName}）
                </li>
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>價格相近，無明顯差異。</p>
            )}
          </div>

        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>完整排名</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>排名</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>項目</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>單位價格</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>總價</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>總量</th>
              </tr>
            </thead>
            <tbody>
              {calcInfo.map((info, idx) => (
                <tr key={info.id} style={{ borderBottom: '1px solid var(--card-border)', background: idx === 0 ? 'var(--success-bg)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{idx + 1}</td>
                  <td style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {info.image && <img src={info.image} alt="icon" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />}
                    {info.itemName}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>
                    ${info.unitPrice === Infinity ? 'N/A' : info.unitPrice.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>${info.priceToUse}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{info.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
});

export default ResultPanel;
