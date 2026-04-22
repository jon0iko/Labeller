'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLabellerStore } from '../lib/store';
import { db } from '../lib/db';
import { useEffect, useState } from 'react';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';

const schema = z.object({
  branchA: z.object({
    hasSlang: z.boolean(),
    slangExpressionType: z.enum(['explicit', 'masked_obfuscated']).optional(),
    slangIntent: z.enum(['expressive_casual', 'directed_malicious']).optional(),
  }),
  branchB: z.object({
    hasCyberbullying: z.boolean(),
    bullyingStyle: z.enum(['explicit', 'implicit_sarcastic']).optional(),
    targetEntity: z.enum(['individual', 'group_community', 'organization']).optional(),
    toxicVectors: z.array(z.enum(['body_shaming', 'gender_based_sexual', 'religious_communal', 'intellectual_status', 'threat_violence'])).optional(),
    severityLevel: z.enum(['low', 'medium', 'high']).optional(),
  }),
});

type FormValues = z.infer<typeof schema>;

export function AnnotationForm() {
  const { currentComment, nextComment, prevComment, refreshState } = useLabellerStore();
  const [tokens, setTokens] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      branchA: { hasSlang: false },
      branchB: { hasCyberbullying: false },
    }
  });

  const { control, handleSubmit, watch, reset } = form;
  const hasSlang = watch('branchA.hasSlang');
  const hasCyberbullying = watch('branchB.hasCyberbullying');
  const toxicVectors = watch('branchB.toxicVectors') || [];

  // Restore state on app mount
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (currentComment) {
      // Split on spaces and extract unique tokens
      const textTokens = currentComment.text.match(/[\w\u0980-\u09FF]+/g) || [];
      setTokens(Array.from(new Set(textTokens)));
      setSelectedWords([]);

      // Try load existing annotation
      db.annotations.get(currentComment.id).then(ann => {
        if (ann && !ann.skipped) {
          reset({
            branchA: ann.branchA || { hasSlang: false },
            branchB: ann.branchB || { hasCyberbullying: false },
          });
        } else {
          reset({
            branchA: { hasSlang: false },
            branchB: { hasCyberbullying: false },
          });
        }
      });
    }
  }, [currentComment, reset]);

  if (!currentComment) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Please load a JSON dataset to begin.</div>;
  }

  const onSubmit = async (data: FormValues) => {
    await db.annotations.put({
      id: currentComment.id,
      text: currentComment.text,
      branchA: {
        ...data.branchA,
        selectedSlangWords: selectedWords
      },
      branchB: data.branchB,
      skipped: false
    });
    
    // Auto-advance
    await nextComment();
  };

  const handleSkip = async () => {
    await db.annotations.put({
      id: currentComment.id,
      text: currentComment.text,
      branchA: { hasSlang: false },
      branchB: { hasCyberbullying: false },
      skipped: true
    });
    await nextComment();
  };

  const toggleToxicVector = (vector: 'body_shaming' | 'gender_based_sexual' | 'religious_communal' | 'intellectual_status' | 'threat_violence') => {
    if (toxicVectors.includes(vector)) {
      form.setValue('branchB.toxicVectors', toxicVectors.filter(v => v !== vector));
    } else {
      form.setValue('branchB.toxicVectors', [...toxicVectors, vector]);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-h-screen overflow-y-auto w-full">
      <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-white shadow-sm border border-slate-200">
        <h3 className="text-base md:text-lg font-medium text-slate-800 mb-2">Comment Text</h3>
        <p className="text-base md:text-lg text-slate-900 leading-relaxed font-serif">
          {currentComment.text}
        </p>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
        
        {/* BRANCH A: SLANG / PROFANITY */}
        <Card className="p-4 md:p-6 bg-blue-50 border border-blue-200">
          <h2 className="text-lg md:text-xl font-bold text-blue-900 mb-4">Branch A: Slang / Profanity</h2>
          
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Controller
                name="branchA.hasSlang"
                control={control}
                render={({ field }) => (
                  <Checkbox 
                    id="hasSlang" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="hasSlang" className="text-base md:text-lg font-semibold">
                Contains Slang / Profanity?
              </Label>
            </div>
          </div>

          {hasSlang && (
            <div className="space-y-4 ml-6 mt-4 pt-4 border-t border-blue-200">
              
              {/* Word Selection */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-blue-900">
                  Select Slang Words (if any)
                </Label>
                <div className="flex flex-wrap gap-2 ml-4">
                  {tokens.map((token, i) => {
                    const isSelected = selectedWords.includes(token);
                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedWords(selectedWords.filter(w => w !== token));
                          } else {
                            setSelectedWords([...selectedWords, token]);
                          }
                        }}
                        className="rounded-full px-3 md:px-4 text-xs md:text-sm py-1 md:py-2"
                      >
                        {token}
                      </Button>
                    )
                  })}
                </div>
              </div>
              
              {/* A1: Slang Expression Type */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-blue-900">
                  A1. Slang Expression Type (How is it written?)
                </Label>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchA.slangExpressionType"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="explicit" 
                            value="explicit"
                            checked={field.value === 'explicit'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="explicit" className="text-sm md:text-base">
                            <span className="font-semibold">Explicit:</span> Standard/common spelling of the profanity
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchA.slangExpressionType"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="masked" 
                            value="masked_obfuscated"
                            checked={field.value === 'masked_obfuscated'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="masked" className="text-sm md:text-base">
                            <span className="font-semibold">Masked / Obfuscated:</span> Using symbols, numbers, or deliberate misspellings (e.g., v@lo, sh@la, b0k@)
                          </label>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* A2: Slang Intent */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-blue-900">
                  A2. Slang Intent (Why was it used?)
                </Label>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchA.slangIntent"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="expressive" 
                            value="expressive_casual"
                            checked={field.value === 'expressive_casual'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="expressive" className="text-sm md:text-base">
                            <span className="font-semibold">Expressive / Casual:</span> Used for emphasis, frustration, or friendly banter
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchA.slangIntent"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="directed" 
                            value="directed_malicious"
                            checked={field.value === 'directed_malicious'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="directed" className="text-sm md:text-base">
                            <span className="font-semibold">Directed / Malicious:</span> Weaponized to insult, demean, or attack a target
                          </label>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* BRANCH B: CYBERBULLYING / TOXICITY */}
        <Card className="p-4 md:p-6 bg-red-50 border border-red-200">
          <h2 className="text-lg md:text-xl font-bold text-red-900 mb-4">Branch B: Cyberbullying / Toxicity</h2>
          
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Controller
                name="branchB.hasCyberbullying"
                control={control}
                render={({ field }) => (
                  <Checkbox 
                    id="hasCyberbullying" 
                    checked={field.value} 
                    onCheckedChange={field.onChange} 
                  />
                )}
              />
              <Label htmlFor="hasCyberbullying" className="text-base md:text-lg font-semibold">
                Contains Cyberbullying / Toxicity?
              </Label>
            </div>
          </div>

          {hasCyberbullying && (
            <div className="space-y-4 ml-6 mt-4 pt-4 border-t border-red-200">
              
              {/* B1: Bullying Style */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-red-900">
                  B1. Bullying Style (How is the attack delivered?)
                </Label>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.bullyingStyle"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="bullying_explicit" 
                            value="explicit"
                            checked={field.value === 'explicit'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="bullying_explicit" className="text-sm md:text-base">
                            <span className="font-semibold">Explicit:</span> Direct insults, threats, or name-calling
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.bullyingStyle"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="bullying_implicit" 
                            value="implicit_sarcastic"
                            checked={field.value === 'implicit_sarcastic'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="bullying_implicit" className="text-sm md:text-base">
                            <span className="font-semibold">Implicit / Sarcastic:</span> Backhanded compliments, rhetorical questions, passive-aggressive toxicity
                          </label>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* B2: Target Entity */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-red-900">
                  B2. Target Entity (Who is the victim?)
                </Label>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.targetEntity"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="individual" 
                            value="individual"
                            checked={field.value === 'individual'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="individual" className="text-sm md:text-base">
                            <span className="font-semibold">Individual:</span> A specific person (original poster, commenter, public figure)
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.targetEntity"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="group" 
                            value="group_community"
                            checked={field.value === 'group_community'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="group" className="text-sm md:text-base">
                            <span className="font-semibold">Group / Community:</span> A demographic, religious group, gender, or community
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.targetEntity"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="organization" 
                            value="organization"
                            checked={field.value === 'organization'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="organization" className="text-sm md:text-base">
                            <span className="font-semibold">Organization:</span> A brand, institution, or political party
                          </label>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* B3: Toxic Vector */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-red-900">
                  B3. Toxic Vector (What is the nature of the attack?) - Select all that apply
                </Label>
                <div className="space-y-2 ml-4">
                  {(
                    [
                      { id: 'body_shaming' as const, label: 'Body Shaming / Appearance', desc: 'Mocking weight, skin tone, facial features' },
                      { id: 'gender_based_sexual' as const, label: 'Gender-Based / Sexual Harassment', desc: 'Slut-shaming, threats of sexual violence, misogyny/misandry' },
                      { id: 'religious_communal' as const, label: 'Religious / Communal', desc: 'Attacking beliefs, practices, or religious identity' },
                      { id: 'intellectual_status' as const, label: 'Intellectual / Status', desc: 'Calling someone uneducated, poor, uncultured' },
                      { id: 'threat_violence' as const, label: 'Threat of Violence / Self-Harm', desc: 'Encouraging self-harm or threatening physical violence' },
                    ] as const
                  ).map((vector) => (
                    <div key={vector.id} className="flex items-start gap-2">
                      <input 
                        type="checkbox" 
                        id={vector.id}
                        checked={toxicVectors.includes(vector.id)}
                        onChange={() => toggleToxicVector(vector.id)}
                        className="w-4 h-4 mt-1"
                      />
                      <label htmlFor={vector.id} className="text-sm md:text-base">
                        <span className="font-semibold block">{vector.label}</span>
                        <span className="text-xs md:text-sm text-slate-600">{vector.desc}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* B4: Severity Level */}
              <div>
                <Label className="text-base font-semibold mb-3 block text-red-900">
                  B4. Severity Level (Triage for moderation)
                </Label>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.severityLevel"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="severity_low" 
                            value="low"
                            checked={field.value === 'low'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="severity_low" className="text-sm md:text-base">
                            <span className="font-semibold">Low:</span> Mild mockery, general disrespect
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.severityLevel"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="severity_medium" 
                            value="medium"
                            checked={field.value === 'medium'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="severity_medium" className="text-sm md:text-base">
                            <span className="font-semibold">Medium:</span> Sustained harassment, deep personal insults
                          </label>
                        </>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      name="branchB.severityLevel"
                      control={control}
                      render={({ field }) => (
                        <>
                          <input 
                            type="radio" 
                            id="severity_high" 
                            value="high"
                            checked={field.value === 'high'}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="severity_high" className="text-sm md:text-base">
                            <span className="font-semibold">High:</span> Severe hate speech, credible threats, extreme sexual harassment
                          </label>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 bg-white p-3 md:p-4 border rounded-xl shadow-sm mt-6 md:mt-8 sticky bottom-4">
          <Button type="button" variant="outline" onClick={prevComment} className="w-full md:w-auto text-sm md:text-base py-2 md:py-2">
            Previous
          </Button>

          <div className="flex gap-2 md:gap-4 w-full md:w-auto">
            <Button type="button" variant="secondary" onClick={handleSkip} className="flex-1 md:flex-none bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm md:text-base py-2 md:py-2">
              Skip
            </Button>
            <Button type="submit" className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base py-2 md:py-2">
              Save & Next
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
