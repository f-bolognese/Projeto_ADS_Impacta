ALTER TABLE public.atendimento
  ADD COLUMN IF NOT EXISTS status_pagamento VARCHAR(10);

UPDATE public.atendimento
SET status_pagamento = 'a_pagar'
WHERE status_pagamento IS NULL;

ALTER TABLE public.atendimento
  ALTER COLUMN status_pagamento SET DEFAULT 'a_pagar';

ALTER TABLE public.atendimento
  ALTER COLUMN status_pagamento SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'atendimento_status_pagamento_check'
      AND conrelid = 'public.atendimento'::regclass
  ) THEN
    ALTER TABLE public.atendimento
      ADD CONSTRAINT atendimento_status_pagamento_check
      CHECK (status_pagamento IN ('pago', 'a_pagar'));
  END IF;
END $$;
