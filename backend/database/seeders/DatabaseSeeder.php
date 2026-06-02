<?php

namespace Database\Seeders;

use App\Models\Comment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Payment;
use App\Models\Progress;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Review;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Services\CourseCertificateIssuer;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('password');
        $stripeCurrency = env('STRIPE_CURRENCY', 'USD');

        $tagIds = collect([
            'laravel',
            'sanctum',
            'api',
            'react',
            'ux',
            'state-management',
            'python',
            'machine-learning',
            'pytorch',
            'docker',
            'ci-cd',
            'kubernetes',
        ])->mapWithKeys(function (string $tag): array {
            $model = Tag::firstOrCreate(
                ['slug' => $tag],
                ['name' => str_replace('-', ' ', $tag)],
            );

            return [$tag => $model->id];
        });

        $admin = User::factory()->create([
            'name' => 'Olena Admin',
            'email' => 'admin@techtutor.test',
            'password' => $password,
            'role' => 'admin',
        ]);

        $backendInstructor = User::factory()->create([
            'name' => 'Maksym Backend',
            'nickname' => 'maksym-backend',
            'bio' => 'Backend engineer who teaches API design, testing, and secure Laravel workflows.',
            'email' => 'backend@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $frontendInstructor = User::factory()->create([
            'name' => 'Ira Frontend',
            'nickname' => 'ira-frontend',
            'bio' => 'Frontend developer focused on course dashboards, accessible UI, and design systems.',
            'email' => 'frontend@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $mlInstructor = User::factory()->create([
            'name' => 'Taras ML',
            'nickname' => 'taras-ml',
            'bio' => 'Machine learning mentor who likes practical notebooks, clean datasets, and reproducible pipelines.',
            'email' => 'ml@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $devopsInstructor = User::factory()->create([
            'name' => 'Oleh DevOps',
            'email' => 'devops@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $extraInstructor = User::factory()->create([
            'name' => 'Nadia CourseOps',
            'email' => 'courses@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $student = User::factory()->create([
            'name' => 'Iryna Student',
            'email' => 'student@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $secondStudent = User::factory()->create([
            'name' => 'Taras Student',
            'email' => 'student2@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $bannedStudent = User::factory()->create([
            'name' => 'Blocked Student',
            'email' => 'banned@techtutor.test',
            'password' => $password,
            'role' => 'student',
            'is_banned' => true,
            'banned_at' => now()->subDay(),
        ]);

        $laravelCourse = Course::create([
            'instructor_id' => $backendInstructor->id,
            'title' => 'Laravel API Bootcamp',
            'slug' => 'laravel-api-bootcamp',
            'description' => 'Build a production-style course backend with Laravel, policies, seeders, and role-aware API flows.',
            'subtitle' => 'Production-style REST APIs with Laravel and Sanctum',
            'category' => 'backend',
            'level' => 'beginner',
            'language' => 'en',
            'what_you_will_learn' => [
                'Create secure REST endpoints with Laravel',
                'Use Sanctum for token-based authentication',
                'Model course tags, enrollments, and publish flows',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 420,
            'price' => 79.00,
            'is_published' => true,
            'published_at' => now()->subDays(10),
        ]);

        $laravelCourse->tags()->sync([
            $tagIds['laravel'],
            $tagIds['sanctum'],
            $tagIds['api'],
        ]);

        $reactCourse = Course::create([
            'instructor_id' => $frontendInstructor->id,
            'title' => 'React UI for Learning Platforms',
            'slug' => 'react-ui-learning-platforms',
            'description' => 'Create a clean student and instructor experience with reusable UI components and role-based states.',
            'subtitle' => 'Build role-aware LMS screens with reusable components',
            'category' => 'frontend',
            'level' => 'intermediate',
            'language' => 'en',
            'what_you_will_learn' => [
                'Build reusable course cards and dashboards in React',
                'Handle role-based UI states for students and instructors',
                'Compose responsive layouts with shared design primitives',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 360,
            'price' => 59.00,
            'is_published' => true,
            'published_at' => now()->subDays(7),
        ]);

        $reactCourse->tags()->sync([
            $tagIds['react'],
            $tagIds['ux'],
            $tagIds['state-management'],
        ]);

        $mlCourse = Course::create([
            'instructor_id' => $mlInstructor->id,
            'title' => 'Practical Machine Learning Pipelines',
            'slug' => 'practical-machine-learning-pipelines',
            'description' => 'Train, evaluate, and ship small ML workflows with reproducible notebooks and deployable APIs.',
            'subtitle' => 'From data prep to model deployment',
            'category' => 'ml/ai',
            'level' => 'intermediate',
            'language' => 'en',
            'what_you_will_learn' => [
                'Prepare datasets for training and evaluation',
                'Train small models with reproducible workflows',
                'Package ML experiments into deployable APIs',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 390,
            'price' => 89.00,
            'is_published' => true,
            'published_at' => now()->subDays(6),
        ]);

        $mlCourse->tags()->sync([
            $tagIds['python'],
            $tagIds['machine-learning'],
            $tagIds['pytorch'],
        ]);

        $devopsCourse = Course::create([
            'instructor_id' => $devopsInstructor->id,
            'title' => 'DevOps Delivery Systems',
            'slug' => 'devops-delivery-systems',
            'description' => 'Build delivery pipelines, container workflows, and deployment guardrails for real teams.',
            'subtitle' => 'CI/CD, containers, and production readiness',
            'category' => 'devops',
            'level' => 'advanced',
            'language' => 'en',
            'what_you_will_learn' => [
                'Containerize apps and move them through CI/CD stages',
                'Design safe deployment workflows for production teams',
                'Add guardrails for releases, rollbacks, and monitoring',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 330,
            'price' => 69.00,
            'is_published' => true,
            'published_at' => now()->subDays(4),
        ]);

        $devopsCourse->tags()->sync([
            $tagIds['docker'],
            $tagIds['ci-cd'],
            $tagIds['kubernetes'],
        ]);

        $draftCourse = Course::create([
            'instructor_id' => $extraInstructor->id,
            'title' => 'Advanced Testing Draft',
            'slug' => 'advanced-testing-draft',
            'description' => 'A draft course that only instructor and admin should see.',
            'subtitle' => 'Feature tests, fixtures, and edge-case coverage',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'what_you_will_learn' => [
                'Write high-confidence feature and integration tests',
                'Prepare fixtures and edge cases for complex flows',
                'Validate publish rules and moderation behavior',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 300,
            'price' => 99.00,
            'is_published' => false,
            'published_at' => null,
        ]);

        $draftCourse->tags()->sync([
            $tagIds['laravel'],
            $tagIds['api'],
        ]);

        $laravelIntro = Module::create([
            'course_id' => $laravelCourse->id,
            'title' => 'Foundation',
            'slug' => 'foundation',
            'position' => 1,
        ]);

        $laravelFlows = Module::create([
            'course_id' => $laravelCourse->id,
            'title' => 'Application Flows',
            'slug' => 'application-flows',
            'position' => 2,
        ]);

        $reactUi = Module::create([
            'course_id' => $reactCourse->id,
            'title' => 'Interface Basics',
            'slug' => 'interface-basics',
            'position' => 1,
        ]);

        $mlWorkflow = Module::create([
            'course_id' => $mlCourse->id,
            'title' => 'Model Foundations',
            'slug' => 'model-foundations',
            'position' => 1,
        ]);

        $devopsPipelines = Module::create([
            'course_id' => $devopsCourse->id,
            'title' => 'Delivery Pipeline Basics',
            'slug' => 'delivery-pipeline-basics',
            'position' => 1,
        ]);

        $welcomeLesson = Lesson::create([
            'module_id' => $laravelIntro->id,
            'title' => 'Welcome and Project Setup',
            'slug' => 'welcome-project-setup',
            'type' => 'lesson',
            'content' => 'Install dependencies, inspect the architecture, and understand the TechTutor domain.',
            'video_url' => null,
            'estimated_time_minutes' => 20,
            'position' => 1,
            'is_published' => true,
        ]);

        $authLesson = Lesson::create([
            'module_id' => $laravelIntro->id,
            'title' => 'Authentication and Tokens',
            'slug' => 'authentication-and-tokens',
            'type' => 'lesson',
            'content' => 'Protect private routes with Sanctum and local development token helpers.',
            'video_url' => null,
            'video_path' => null,
            'estimated_time_minutes' => 35,
            'position' => 2,
            'is_published' => true,
        ]);

        $paymentsLesson = Lesson::create([
            'module_id' => $laravelFlows->id,
            'title' => 'Enrollment, Payments, and Progress',
            'slug' => 'enrollment-payments-progress',
            'type' => 'lesson',
            'content' => 'Model the purchase journey and keep student progress in sync with enrollments.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $reactLesson = Lesson::create([
            'module_id' => $reactUi->id,
            'title' => 'Dashboard Skeleton',
            'slug' => 'dashboard-skeleton',
            'type' => 'lesson',
            'content' => 'Build a minimal but useful dashboard using shadcn/ui and role-aware sections.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $mlLesson = Lesson::create([
            'module_id' => $mlWorkflow->id,
            'title' => 'Data Preparation Workflow',
            'slug' => 'data-preparation-workflow',
            'type' => 'lesson',
            'content' => 'Clean, split, and validate datasets before training a model.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 1,
            'is_published' => true,
        ]);

        $devopsLesson = Lesson::create([
            'module_id' => $devopsPipelines->id,
            'title' => 'Containerized Delivery',
            'slug' => 'containerized-delivery',
            'type' => 'lesson',
            'content' => 'Package applications into containers and push them through a simple CI/CD flow.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $laravelQuiz = Quiz::create([
            'course_id' => $laravelCourse->id,
            'module_id' => $laravelIntro->id,
            'title' => 'API Fundamentals Quiz',
            'description' => 'Check the core backend concepts from the first modules.',
            'pass_score' => 70,
            'estimated_time_minutes' => 15,
            'is_published' => true,
            'position' => 3,
        ]);

        $sanctumQuestion = $laravelQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Which Laravel package protects the API demo routes?',
            'options' => [
                ['key' => 'sanctum', 'text' => 'Laravel Sanctum'],
                ['key' => 'vite', 'text' => 'Vite'],
            ],
            'correct_answers' => ['sanctum'],
            'points' => 1,
            'position' => 1,
        ]);

        $backendQuestion = $laravelQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which pieces belong to the backend flow?',
            'options' => [
                ['key' => 'policies', 'text' => 'Policies'],
                ['key' => 'middleware', 'text' => 'Middleware'],
                ['key' => 'tailwind', 'text' => 'Tailwind utility classes'],
            ],
            'correct_answers' => ['policies', 'middleware'],
            'points' => 2,
            'position' => 2,
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $laravelCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(5),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $reactCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(3),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $mlCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(2),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $devopsCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(1),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $laravelCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(2),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $welcomeLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(4),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $authLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(4),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $paymentsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(4),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $reactLesson->id,
            'progress_percent' => 45,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $mlLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        app(CourseCertificateIssuer::class)->issueIfEligible($mlCourse, $student);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $devopsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $laravelCourse->id,
            'provider' => 'stripe',
            'amount' => 79.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_laravel_student',
            'paid_at' => now()->subDays(5),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $reactCourse->id,
            'provider' => 'stripe',
            'amount' => 59.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_react_student',
            'paid_at' => now()->subDays(3),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $mlCourse->id,
            'provider' => 'stripe',
            'amount' => 89.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_ml_student',
            'paid_at' => now()->subDays(2),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $devopsCourse->id,
            'provider' => 'stripe',
            'amount' => 69.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_devops_student',
            'paid_at' => now()->subDay(),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $laravelCourse->id,
            'provider' => 'liqpay',
            'amount' => 79.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_laravel_student_two',
            'paid_at' => now()->subDays(2),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $reactCourse->id,
            'provider' => 'stripe',
            'amount' => 59.00,
            'currency' => $stripeCurrency,
            'status' => 'pending',
            'transaction_id' => 'seed_txn_react_student_two_pending',
            'paid_at' => null,
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $devopsCourse->id,
            'provider' => 'stripe',
            'amount' => 69.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_devops_student_repeat',
            'paid_at' => now()->subHours(12),
        ]);

        Review::create([
            'course_id' => $laravelCourse->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Great structure, clear backend flow, and the lessons feel practical.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $reactCourse->id,
            'user_id' => $student->id,
            'rating' => 4,
            'comment' => 'Waiting for review approval so admins can test the moderation queue.',
            'is_published' => false,
        ]);

        Review::create([
            'course_id' => $mlCourse->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Strong practical ML walkthroughs and enough detail to ship a real project.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $devopsCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 4,
            'comment' => 'The delivery pipeline examples feel close to how teams actually work.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $laravelCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 5,
            'comment' => 'Exactly the kind of course I wanted for API practice.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $welcomeLesson->id,
            'user_id' => $student->id,
            'body' => 'The setup checklist was super clear. I got the project running fast.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $authLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Leaving this unpublished so admins can test comment moderation too.',
            'is_published' => false,
        ]);

        Comment::create([
            'lesson_id' => $mlLesson->id,
            'user_id' => $student->id,
            'body' => 'The dataset split explanation was clear and easy to follow.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $devopsLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'This pipeline setup maps well to production deployments.',
            'is_published' => true,
        ]);

        QuizAttempt::create([
            'quiz_id' => $laravelQuiz->id,
            'user_id' => $student->id,
            'score' => 100,
            'passed' => true,
            'answers' => [
                (string) $sanctumQuestion->id => 'sanctum',
                (string) $backendQuestion->id => ['middleware', 'policies'],
            ],
            'started_at' => now()->subDays(4),
            'completed_at' => now()->subDays(4),
        ]);

        app(CourseCertificateIssuer::class)->issueIfEligible($laravelCourse, $student);

        QuizAttempt::create([
            'quiz_id' => $laravelQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 100,
            'passed' => true,
            'answers' => [
                (string) $sanctumQuestion->id => 'sanctum',
                (string) $backendQuestion->id => ['middleware', 'policies'],
            ],
            'started_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        // Mark second student as having completed all lessons for the Laravel course
        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $welcomeLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $authLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $paymentsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        // Issue a certificate if eligible (service will no-op if not)
        app(CourseCertificateIssuer::class)->issueIfEligible($laravelCourse, $secondStudent);

        $this->command?->info('Seeded accounts (password: password)');
        $this->command?->line('admin@techtutor.test');
        $this->command?->line('backend@techtutor.test');
        $this->command?->line('frontend@techtutor.test');
        $this->command?->line('ml@techtutor.test');
        $this->command?->line('devops@techtutor.test');
        $this->command?->line('student@techtutor.test');
        $this->command?->line('student2@techtutor.test');
        $this->command?->line('banned@techtutor.test');
        $this->command?->info(sprintf('Demo content created by %s, %s, %s, and %s for %s, %s, and admin views.', $backendInstructor->email, $frontendInstructor->email, $mlInstructor->email, $devopsInstructor->email, $student->email, $secondStudent->email));
    }
}
