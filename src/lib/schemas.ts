import { z } from 'zod';

export const LoginSchema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
});

export const RegisterSchema = z.object({
  email:        z.string().email('Email inválido'),
  password:     z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  display_name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(50),
});

export const PickSchema = z.object({
  match_id:  z.string().uuid(),
  home_pick: z.number().int().min(0).max(20),
  away_pick: z.number().int().min(0).max(20),
});

export const SpecialPicksSchema = z.object({
  champion:    z.string().min(2),
  runner_up:   z.string().min(2),
  top_scorer:  z.string().min(2).max(100),
  golden_ball: z.string().min(2).max(100),
});

export const BonusAnswerSchema = z.object({
  question_id: z.string().uuid(),
  answer:      z.string().min(1).max(500),
});

export const BonusQuestionSchema = z.object({
  match_id:      z.string().uuid(),
  question_text: z.string().min(5).max(500),
  points_value:  z.number().int().min(1).max(10),
});

export const UpdateDisplayNameSchema = z.object({
  display_name: z.string().min(2).max(50),
});

export type LoginInput         = z.infer<typeof LoginSchema>;
export type RegisterInput      = z.infer<typeof RegisterSchema>;
export type PickInput          = z.infer<typeof PickSchema>;
export type SpecialPicksInput  = z.infer<typeof SpecialPicksSchema>;
export type BonusAnswerInput   = z.infer<typeof BonusAnswerSchema>;
export type BonusQuestionInput = z.infer<typeof BonusQuestionSchema>;
