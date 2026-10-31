const ITEMS = [
  'Native Vulkan',
  'Direct3D 12',
  'Metal',
  'Original artwork',
  'FSR 1.0',
  'HDR groundwork',
  '110 levels',
  'Zero translation layers',
  'GPL-3.0',
  'Gamepad ready',
]

export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {[0, 1].map((copy) => (
          <div className="ticker__group" key={copy}>
            {ITEMS.map((item) => (
              <span className="ticker__item" key={`${copy}-${item}`}>
                {item}
                <span className="ticker__star">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
