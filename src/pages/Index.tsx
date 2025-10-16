import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import funcUrls from '../../backend/func2url.json';

interface Material {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  questionsGenerated: number;
}

interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  materialId: string;
}

interface Exam {
  id: string;
  name: string;
  questionCount: number;
  createdDate: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const Index = () => {
  const [materials, setMaterials] = useState<Material[]>([
    { id: '1', name: 'Основы алгебры.pdf', type: 'PDF', uploadDate: '2024-10-10', questionsGenerated: 15 },
    { id: '2', name: 'История России.docx', type: 'DOCX', uploadDate: '2024-10-12', questionsGenerated: 23 },
  ]);

  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', text: 'Что такое квадратное уравнение?', difficulty: 'easy', materialId: '1' },
    { id: '2', text: 'Решите уравнение: x² + 5x + 6 = 0', difficulty: 'medium', materialId: '1' },
    { id: '3', text: 'В каком году началась Великая Отечественная война?', difficulty: 'easy', materialId: '2' },
  ]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMaterialForGeneration, setSelectedMaterialForGeneration] = useState<string>('');

  const [exams] = useState<Exam[]>([
    { id: '1', name: 'Экзамен по алгебре', questionCount: 15, createdDate: '2024-10-13', difficulty: 'medium' },
    { id: '2', name: 'Тест по истории', questionCount: 10, createdDate: '2024-10-14', difficulty: 'easy' },
  ]);

  const [questionCount, setQuestionCount] = useState([20]);
  const [difficultyLevel, setDifficultyLevel] = useState([50]);
  const [activeTab, setActiveTab] = useState('upload');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newMaterials = Array.from(files).map((file, index) => ({
        id: `${materials.length + index + 1}`,
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        uploadDate: new Date().toISOString().split('T')[0],
        questionsGenerated: 0,
      }));
      setMaterials([...materials, ...newMaterials]);
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'bg-accent/20 text-accent';
      case 'medium': return 'bg-secondary/20 text-secondary';
      case 'hard': return 'bg-destructive/20 text-destructive';
    }
  };

  const getDifficultyLabel = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedMaterialForGeneration) {
      toast({
        title: 'Выберите материал',
        description: 'Пожалуйста, выберите материал для генерации вопросов',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);

    try {
      const difficultyMap: Record<number, string> = {
        0: 'easy',
        50: 'medium',
        100: 'hard'
      };
      
      const closestDifficulty = [0, 50, 100].reduce((prev, curr) => 
        Math.abs(curr - difficultyLevel[0]) < Math.abs(prev - difficultyLevel[0]) ? curr : prev
      );

      const materialSample = `Образец учебного материала по теме "${materials.find(m => m.id === selectedMaterialForGeneration)?.name || 'материал'}". 
      Это может быть текст из учебника, лекции или другого учебного источника.`;

      const response = await fetch(funcUrls['generate-questions'], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialText: materialSample,
          difficulty: difficultyMap[closestDifficulty],
          questionCount: questionCount[0]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка генерации');
      }

      const newQuestions: Question[] = data.questions.map((q: any) => ({
        ...q,
        materialId: selectedMaterialForGeneration
      }));

      setQuestions([...questions, ...newQuestions]);

      setMaterials(materials.map(m => 
        m.id === selectedMaterialForGeneration 
          ? { ...m, questionsGenerated: m.questionsGenerated + newQuestions.length }
          : m
      ));

      toast({
        title: 'Вопросы сгенерированы!',
        description: `Успешно создано ${newQuestions.length} вопросов с помощью AI`,
      });

      setActiveTab('generator');

    } catch (error: any) {
      toast({
        title: 'Ошибка генерации',
        description: error.message || 'Не удалось сгенерировать вопросы. Проверьте настройки API.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-ai flex items-center justify-center">
                <Icon name="Brain" size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Marich.gen
                </h1>
                <p className="text-xs text-muted-foreground">Intelligent Question Generation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Icon name="Bell" size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Icon name="User" size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon name="FileText" size={24} className="text-primary" />
                <Badge variant="secondary" className="font-mono">+12%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold mb-1">{materials.length}</div>
              <p className="text-sm text-muted-foreground">Материалов</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon name="Sparkles" size={24} className="text-secondary" />
                <Badge variant="secondary" className="font-mono">AI</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold mb-1">{questions.length}</div>
              <p className="text-sm text-muted-foreground">Вопросов сгенерировано</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon name="ClipboardList" size={24} className="text-accent" />
                <Badge variant="secondary" className="font-mono">NEW</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold mb-1">{exams.length}</div>
              <p className="text-sm text-muted-foreground">Экзаменов готово</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Icon name="TrendingUp" size={24} className="text-primary" />
                <Badge variant="secondary" className="font-mono">78%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold mb-1">85%</div>
              <p className="text-sm text-muted-foreground">Точность AI</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full bg-muted/50">
            <TabsTrigger value="upload" className="gap-2">
              <Icon name="Upload" size={16} />
              Загрузка
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <Icon name="Library" size={16} />
              Библиотека
            </TabsTrigger>
            <TabsTrigger value="generator" className="gap-2">
              <Icon name="Zap" size={16} />
              Генератор
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <Icon name="ClipboardList" size={16} />
              Билеты
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Icon name="BarChart3" size={16} />
              Аналитика
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Icon name="Settings" size={16} />
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 animate-fade-in">
            <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors duration-300">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="Upload" size={24} className="text-primary" />
                  Загрузка материалов
                </CardTitle>
                <CardDescription>Загрузите PDF, Word, Excel или другие типы файлов для анализа</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="hexagon-pattern rounded-xl p-12 text-center border border-border/50">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full gradient-ai flex items-center justify-center animate-glow">
                      <Icon name="FileUp" size={32} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-lg mb-1">Перетащите файлы сюда</h3>
                      <p className="text-sm text-muted-foreground">или нажмите для выбора файлов</p>
                    </div>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={handleFileUpload}
                      className="max-w-xs"
                    />
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline">PDF</Badge>
                      <Badge variant="outline">Word</Badge>
                      <Badge variant="outline">Excel</Badge>
                      <Badge variant="outline">PowerPoint</Badge>
                      <Badge variant="outline">TXT</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-primary/5">
                    <CardHeader className="pb-3">
                      <Icon name="Scan" size={20} className="text-primary mb-2" />
                      <CardTitle className="text-sm font-heading">AI Анализ</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Автоматическое распознавание ключевых тем и концепций
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/5">
                    <CardHeader className="pb-3">
                      <Icon name="Sparkles" size={20} className="text-secondary mb-2" />
                      <CardTitle className="text-sm font-heading">Умная генерация</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Создание вопросов разной сложности на основе материала
                    </CardContent>
                  </Card>
                  <Card className="bg-accent/5">
                    <CardHeader className="pb-3">
                      <Icon name="Shield" size={20} className="text-accent mb-2" />
                      <CardTitle className="text-sm font-heading">Безопасность</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      Все файлы хранятся зашифрованными и защищены
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="Library" size={24} className="text-primary" />
                  Библиотека материалов
                </CardTitle>
                <CardDescription>Все загруженные учебные материалы</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {materials.map((material) => (
                    <Card 
                      key={material.id} 
                      className={`hover:shadow-md transition-all duration-300 cursor-pointer ${
                        selectedMaterialForGeneration === material.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedMaterialForGeneration(material.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg gradient-ai flex items-center justify-center">
                              <Icon name="FileText" size={24} className="text-white" />
                            </div>
                            <div>
                              <h4 className="font-heading font-semibold">{material.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge variant="outline" className="text-xs">{material.type}</Badge>
                                <span className="text-xs text-muted-foreground">{material.uploadDate}</span>
                                <span className="text-xs text-primary font-semibold">
                                  {material.questionsGenerated} вопросов
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedMaterialForGeneration === material.id && (
                              <Badge className="gradient-ai text-white border-0">Выбран</Badge>
                            )}
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <Icon name="Eye" size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <Icon name="Download" size={16} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {selectedMaterialForGeneration && (
                  <div className="mt-6 p-6 rounded-lg bg-primary/5 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full gradient-ai flex items-center justify-center animate-glow">
                          <Icon name="Sparkles" size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-heading font-semibold">Готовы генерировать?</h4>
                          <p className="text-sm text-muted-foreground">
                            Выбран материал: {materials.find(m => m.id === selectedMaterialForGeneration)?.name}
                          </p>
                        </div>
                      </div>
                      <Button 
                        className="gradient-ai text-white border-0" 
                        onClick={handleGenerateQuestions}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
                          <>
                            <Icon name="Loader2" size={16} className="animate-spin" />
                            Генерация...
                          </>
                        ) : (
                          <>
                            <Icon name="Sparkles" size={16} />
                            Сгенерировать вопросы
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generator" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="Zap" size={24} className="text-primary" />
                  AI Генератор вопросов
                </CardTitle>
                <CardDescription>Просмотр сгенерированных вопросов из материалов</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question) => (
                    <Card key={question.id} className="hover:shadow-md transition-shadow duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getDifficultyColor(question.difficulty)}>
                                {getDifficultyLabel(question.difficulty)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Материал #{question.materialId}
                              </span>
                            </div>
                            <p className="text-foreground">{question.text}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Icon name="Edit" size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Icon name="Trash2" size={16} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {questions.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 rounded-full gradient-ai flex items-center justify-center mx-auto mb-4 animate-glow">
                      <Icon name="Sparkles" size={32} className="text-white" />
                    </div>
                    <h3 className="font-heading font-semibold text-lg mb-2">Вопросы еще не созданы</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Перейдите в Библиотеку, выберите материал и нажмите "Сгенерировать вопросы"
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('library')}
                    >
                      Перейти к библиотеке
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="ClipboardList" size={24} className="text-primary" />
                  Мои экзаменационные билеты
                </CardTitle>
                <CardDescription>Созданные билеты для экзаменов и тестирования</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exams.map((exam) => (
                    <Card key={exam.id} className="hover:shadow-md transition-shadow duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg gradient-ai flex items-center justify-center">
                              <Icon name="FileCheck" size={24} className="text-white" />
                            </div>
                            <div>
                              <h4 className="font-heading font-semibold">{exam.name}</h4>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge className={getDifficultyColor(exam.difficulty)}>
                                  {getDifficultyLabel(exam.difficulty)}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{exam.createdDate}</span>
                                <span className="text-xs text-primary font-semibold">
                                  {exam.questionCount} вопросов
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Icon name="Eye" size={16} />
                              Просмотр
                            </Button>
                            <Button variant="outline" size="sm">
                              <Icon name="Download" size={16} />
                              Экспорт
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6">
                  <Button className="w-full gradient-ai text-white border-0" size="lg">
                    <Icon name="Plus" size={20} />
                    Создать новый экзамен
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Icon name="BarChart3" size={24} className="text-primary" />
                    Статистика по сложности
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Легкие вопросы</span>
                      <span className="text-sm font-semibold">35%</span>
                    </div>
                    <Progress value={35} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Средние вопросы</span>
                      <span className="text-sm font-semibold">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Сложные вопросы</span>
                      <span className="text-sm font-semibold">20%</span>
                    </div>
                    <Progress value={20} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Icon name="TrendingUp" size={24} className="text-secondary" />
                    Активность генерации
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
                      <span className="text-sm">Сегодня</span>
                      <span className="text-sm font-semibold text-primary">12 вопросов</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">Эта неделя</span>
                      <span className="text-sm font-semibold">48 вопросов</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">Этот месяц</span>
                      <span className="text-sm font-semibold">156 вопросов</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="Brain" size={24} className="text-accent" />
                  AI Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="text-3xl font-heading font-bold text-primary mb-1">85%</div>
                    <div className="text-xs text-muted-foreground">Точность</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5">
                    <div className="text-3xl font-heading font-bold text-secondary mb-1">2.3с</div>
                    <div className="text-xs text-muted-foreground">Ср. время генерации</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-accent/10 to-accent/5">
                    <div className="text-3xl font-heading font-bold text-accent mb-1">92%</div>
                    <div className="text-xs text-muted-foreground">Качество</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5">
                    <div className="text-3xl font-heading font-bold text-primary mb-1">156</div>
                    <div className="text-xs text-muted-foreground">Всего вопросов</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Icon name="Settings" size={24} className="text-primary" />
                  Настройки генерации
                </CardTitle>
                <CardDescription>Настройте параметры AI для создания вопросов</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="font-heading">Количество вопросов</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={questionCount}
                      onValueChange={setQuestionCount}
                      max={50}
                      min={5}
                      step={5}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="font-mono w-12 justify-center">
                      {questionCount[0]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Сколько вопросов генерировать за раз</p>
                </div>

                <div className="space-y-3">
                  <Label className="font-heading">Уровень сложности</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={difficultyLevel}
                      onValueChange={setDifficultyLevel}
                      max={100}
                      min={0}
                      step={10}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="font-mono w-12 justify-center">
                      {difficultyLevel[0]}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Легкий</span>
                    <span>Средний</span>
                    <span>Сложный</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 pt-4">
                  <Card className="bg-muted/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon name="Languages" size={20} className="text-primary" />
                        <CardTitle className="text-sm font-heading">Язык генерации</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <select className="w-full p-2 rounded-md border border-border bg-background text-sm">
                        <option>Русский</option>
                        <option>English</option>
                      </select>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/30">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Icon name="FileType" size={20} className="text-secondary" />
                        <CardTitle className="text-sm font-heading">Формат экспорта</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <select className="w-full p-2 rounded-md border border-border bg-background text-sm">
                        <option>PDF</option>
                        <option>DOCX</option>
                        <option>XLSX</option>
                        <option>JSON</option>
                      </select>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <Button variant="outline">Сбросить</Button>
                  <Button className="gradient-ai text-white border-0">
                    <Icon name="Save" size={16} />
                    Сохранить настройки
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;