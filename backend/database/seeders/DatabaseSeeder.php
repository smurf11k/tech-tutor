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
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $password = Hash::make('password');

        $admin = User::factory()->create([
            'name' => 'Olena Admin',
            'email' => 'admin@techtutor.test',
            'password' => $password,
            'role' => 'admin',
        ]);

        $instructor = User::factory()->create([
            'name' => 'Maksym Instructor',
            'email' => 'instructor@techtutor.test',
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
            'instructor_id' => $instructor->id,
            'title' => 'Laravel API Bootcamp',
            'slug' => 'laravel-api-bootcamp',
            'description' => 'Build a production-style course backend with Laravel, policies, seeders, and role-aware API flows.',
            'subtitle' => 'Production-style REST APIs with Laravel and Sanctum',
            'category' => 'backend',
            'level' => 'beginner',
            'language' => 'en',
            'thumbnail_path' => null,
            'duration_minutes' => 420,
            'price' => 79.00,
            'is_published' => true,
            'published_at' => now()->subDays(10),
        ]);

        $reactCourse = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'React UI for Learning Platforms',
            'slug' => 'react-ui-learning-platforms',
            'description' => 'Create a clean student and instructor experience with reusable UI components and role-based states.',
            'subtitle' => 'Build role-aware LMS screens with reusable components',
            'category' => 'frontend',
            'level' => 'intermediate',
            'language' => 'en',
            'thumbnail_path' => null,
            'duration_minutes' => 360,
            'price' => 59.00,
            'is_published' => true,
            'published_at' => now()->subDays(7),
        ]);

        $draftCourse = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Advanced Testing Draft',
            'slug' => 'advanced-testing-draft',
            'description' => 'A draft course that only instructor and admin should see.',
            'subtitle' => 'Feature tests, fixtures, and edge-case coverage',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'thumbnail_path' => null,
            'duration_minutes' => 300,
            'price' => 99.00,
            'is_published' => false,
            'published_at' => null,
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

        $welcomeLesson = Lesson::create([
            'module_id' => $laravelIntro->id,
            'title' => 'Welcome and Project Setup',
            'slug' => 'welcome-project-setup',
            'type' => 'text',
            'content' => 'Install dependencies, inspect the architecture, and understand the TechTutor domain.',
            'video_url' => null,
            'file_path' => null,
            'position' => 1,
            'is_preview' => true,
        ]);

        $authLesson = Lesson::create([
            'module_id' => $laravelIntro->id,
            'title' => 'Authentication and Tokens',
            'slug' => 'authentication-and-tokens',
            'type' => 'text',
            'content' => 'Protect private routes with Sanctum and local development token helpers.',
            'video_url' => null,
            'file_path' => null,
            'position' => 2,
            'is_preview' => false,
        ]);

        $paymentsLesson = Lesson::create([
            'module_id' => $laravelFlows->id,
            'title' => 'Enrollment, Payments, and Progress',
            'slug' => 'enrollment-payments-progress',
            'type' => 'text',
            'content' => 'Model the purchase journey and keep student progress in sync with enrollments.',
            'video_url' => null,
            'file_path' => null,
            'position' => 1,
            'is_preview' => false,
        ]);

        $reactLesson = Lesson::create([
            'module_id' => $reactUi->id,
            'title' => 'Dashboard Skeleton',
            'slug' => 'dashboard-skeleton',
            'type' => 'text',
            'content' => 'Build a minimal but useful dashboard using shadcn/ui and role-aware sections.',
            'video_url' => null,
            'file_path' => null,
            'position' => 1,
            'is_preview' => true,
        ]);

        $laravelQuiz = Quiz::create([
            'course_id' => $laravelCourse->id,
            'title' => 'API Fundamentals Quiz',
            'description' => 'Check the core backend concepts from the first modules.',
            'pass_score' => 70,
            'is_published' => true,
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
            'progress_percent' => 85,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $reactLesson->id,
            'progress_percent' => 45,
            'completed_at' => null,
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $laravelCourse->id,
            'provider' => 'stripe',
            'amount' => 79.00,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'seed_txn_laravel_student',
            'paid_at' => now()->subDays(5),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $reactCourse->id,
            'provider' => 'stripe',
            'amount' => 59.00,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'seed_txn_react_student',
            'paid_at' => now()->subDays(3),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $laravelCourse->id,
            'provider' => 'liqpay',
            'amount' => 79.00,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'seed_txn_laravel_student_two',
            'paid_at' => now()->subDays(2),
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

        QuizAttempt::create([
            'quiz_id' => $laravelQuiz->id,
            'user_id' => $student->id,
            'score' => 88,
            'passed' => true,
            'answers' => [
                'q1' => 'sanctum',
                'q2' => 'policy',
            ],
            'started_at' => now()->subDays(4),
            'completed_at' => now()->subDays(4),
        ]);

        QuizAttempt::create([
            'quiz_id' => $laravelQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 72,
            'passed' => true,
            'answers' => [
                'q1' => 'sanctum',
                'q2' => 'middleware',
            ],
            'started_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        $this->command?->info('Seeded demo accounts (password: password)');
        $this->command?->line('admin@techtutor.test');
        $this->command?->line('instructor@techtutor.test');
        $this->command?->line('student@techtutor.test');
        $this->command?->line('student2@techtutor.test');
        $this->command?->line('banned@techtutor.test');
        $this->command?->info(sprintf('Demo content created by %s for %s, %s, and admin views.', $instructor->email, $student->email, $secondStudent->email));
    }
}
