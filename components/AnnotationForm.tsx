'use client';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLabellerStore } from '../lib/store';
import { db } from '../lib/db';
import { useEffect, useState } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Card } from './ui/card';

const schema = z.object({
  hasSlang: z.boolean(),
  isCyberbullying: z.boolean(),
  selectedWords: z.array(z.string()),
  slangAnnotations: z.array(z.object({
    word: z.string(),
    rootWord: z.string(),
    usesBypass: z.boolean(),
    bypassType: z.enum(['codemixed', 'spelling variation', 'other']),
    bypassTypeOther: z.string().nullable()
  }))
});

type FormValues = z.infer<typeof schema>;

export function AnnotationForm() {
  const { currentComment, nextComment, prevComment, refreshState } = useLabellerStore();
  const [tokens, setTokens] = useState<string[]>([]);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      hasSlang: false,
      isCyberbullying: false,
      selectedWords: [],
      slangAnnotations: []
    }
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const { fields, replace } = useFieldArray({ control, name: 'slangAnnotations' });
  const selectedWords = watch('selectedWords');

  // Restore state on app mount
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (currentComment) {
      // Split on spaces and map removing specific punctuation
      const textTokens = currentComment.text.replace(/[^\w\s\u0980-\u09FF]/g, '').split(/\s+/).filter(Boolean);
      setTokens(Array.from(new Set(textTokens)));

      // Try load existing annotation
      db.annotations.get(currentComment.id).then(ann => {
        if (ann && !ann.skipped) {
          reset({
            hasSlang: ann.hasSlang,
            isCyberbullying: ann.isCyberbullying,
            selectedWords: ann.slangAnnotations.map(s => s.word),
            slangAnnotations: ann.slangAnnotations
          });
        } else {
          reset({
            hasSlang: false,
            isCyberbullying: false,
            selectedWords: [],
            slangAnnotations: []
          });
        }
      });
    }
  }, [currentComment, reset]);

  // Sync selected words with slangAnnotations array
  useEffect(() => {
    const currentAnnos = watch('slangAnnotations');
    
    // Add new words
    const toAdd = selectedWords.filter(w => !currentAnnos.some(a => a.word === w));
    // Keep existing
    const toKeep = currentAnnos.filter(a => selectedWords.includes(a.word));

    if (toAdd.length > 0 || toKeep.length !== currentAnnos.length) {
      const newAnnos = [
        ...toKeep,
        ...toAdd.map(word => ({
          word,
          rootWord: '',
          usesBypass: false,
          bypassType: 'spelling variation' as const,
          bypassTypeOther: null
        }))
      ];
      replace(newAnnos);
    }
  }, [selectedWords, replace, watch]);

  if (!currentComment) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Please load a JSON dataset to begin.</div>;
  }

  const onSubmit = async (data: FormValues) => {
    await db.annotations.put({
      id: currentComment.id,
      text: currentComment.text,
      hasSlang: data.hasSlang,
      isCyberbullying: data.isCyberbullying,
      slangAnnotations: data.slangAnnotations,
      skipped: false
    });
    
    // Auto-advance
    await nextComment();
  };

  const handleSkip = async () => {
    await db.annotations.put({
      id: currentComment.id,
      text: currentComment.text,
      hasSlang: false,
      isCyberbullying: false,
      slangAnnotations: [],
      skipped: true
    });
    await nextComment();
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-h-screen overflow-y-auto w-full relative">
      <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-white shadow-sm border border-slate-200">
        <h3 className="text-base md:text-lg font-medium text-slate-800 mb-2">Comment Text</h3>
        <p className="text-base md:text-lg text-slate-900 leading-relaxed font-serif">
          {currentComment.text}
        </p>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 p-3 md:p-4 bg-slate-50 border rounded-lg">
          <div className="flex items-center gap-2">
            <Controller
              name="hasSlang"
              control={control}
              render={({ field }) => (
                <Checkbox id="hasSlang" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="hasSlang" className="text-sm md:text-base">Slang?</Label>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              name="isCyberbullying"
              control={control}
              render={({ field }) => (
                <Checkbox id="cyberbullying" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="cyberbullying" className="text-sm md:text-base">Bullying?</Label>
          </div>
        </div>

        {watch('hasSlang') && (
          <Card className="p-4 md:p-6">
            <Label className="text-base md:text-lg mb-3 md:mb-4 block">Select Slang Words</Label>
            <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
              {tokens.map((token, i) => {
                const isSelected = selectedWords.includes(token);
                return (
                  <Button
                    key={i}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      if (isSelected) {
                        setValue('selectedWords', selectedWords.filter(w => w !== token));
                      } else {
                        setValue('selectedWords', [...selectedWords, token]);
                      }
                    }}
                    className="rounded-full px-3 md:px-4 text-xs md:text-sm py-1 md:py-2"
                  >
                    {token}
                  </Button>
                )
              })}
            </div>

            {fields.map((field, index) => {
              const bypassType = watch(`slangAnnotations.${index}.bypassType`);
              const usesBypass = watch(`slangAnnotations.${index}.usesBypass`);

              return (
                <div key={field.id} className="border border-slate-200 p-3 md:p-4 rounded-xl mb-3 md:mb-4 bg-slate-50">
                  <div className="font-bold text-base md:text-lg text-blue-600 mb-3 md:mb-4">{field.word}</div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div>
                      <Label className="text-sm md:text-base">Corresponding Bangla Root</Label>
                      <Controller
                        name={`slangAnnotations.${index}.rootWord`}
                        control={control}
                        render={({ field }) => <Input {...field} placeholder="Bangla root word" className="mt-1 text-sm md:text-base" />}
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm md:text-base">Uses Bypass Method?</Label>
                      <Controller
                        name={`slangAnnotations.${index}.usesBypass`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2 mt-2">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            <span className="text-sm md:text-base">Yes, uses bypass</span>
                          </div>
                        )}
                      />
                    </div>

                    {usesBypass && (
                      <>
                        <div>
                          <Label className="text-sm md:text-base">Bypass Code Type</Label>
                          <Controller
                            name={`slangAnnotations.${index}.bypassType`}
                            control={control}
                            render={({ field }) => (
                              <div className="mt-1">
                                <select 
                                  value={field.value} 
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <option value="codemixed">Codemixed</option>
                                  <option value="spelling variation">Spelling Variation</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            )}
                          />
                        </div>

                        {bypassType === 'other' && (
                          <div>
                            <Label>Other Bypass Method</Label>
                            <Controller
                              name={`slangAnnotations.${index}.bypassTypeOther`}
                              control={control}
                              render={({ field }) => <Input {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value)} placeholder="Describe..." className="mt-1" />}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {/* Buttons */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 bg-white p-3 md:p-4 border rounded-xl shadow-sm mt-6 md:mt-8 bottom-4 sticky">
          <Button type="button" variant="outline" onClick={prevComment} className="w-full md:w-auto text-sm md:text-base py-2 md:py-2">
            Previous
          </Button>

          <div className="flex gap-2 md:gap-4 w-full md:w-auto">
            <Button type="button" variant="secondary" onClick={handleSkip} className="flex-1 md:flex-none bg-orange-100 hover:bg-orange-200 text-orange-800 text-sm md:text-base py-2 md:py-2">
              Skip
            </Button>
            <Button type="submit" className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-sm md:text-base py-2 md:py-2">
              Save & Next
            </Button>
          </div>
        </div>

      </form>
    </div>
  );
}
