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
use Illuminate\Support\Str;
use App\Services\CourseCertificateIssuer;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * @phpstan-ignore
     */
    public function run(): void
    {
        $password = Hash::make('password');
        $stripeCurrency = env('STRIPE_CURRENCY', 'EUR');

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
            'javascript',
            'typescript',
            'figma',
            'accessibility',
            'pandas',
            'visualization',
            'security',
            'aws',
            'terraform',
            'solidity',
            'web3',
            'react-native',
            'mobile',
            'jest',
            'testing',
            'ui-components',
            'backend',
            'data',
            'monitoring',
            'devops',
        ])->mapWithKeys(function (string $tag): array {
            $model = Tag::firstOrCreate(
                ['slug' => $tag],
                ['name' => str_replace('-', ' ', $tag)],
            );

            return [$tag => $model->id];
        });

        $admin = $this->createUser([
            'name' => 'Olena Admin',
            'email' => 'admin@techtutor.test',
            'password' => $password,
            'role' => 'admin',
        ]);

        $admin2 = $this->createUser([
            'name' => 'Petro Administrator',
            'email' => 'admin2@techtutor.test',
            'password' => $password,
            'role' => 'admin',
        ]);

        $admin3 = $this->createUser([
            'name' => 'Mariya SuperAdmin',
            'email' => 'admin3@techtutor.test',
            'password' => $password,
            'role' => 'admin',
        ]);

        $backendInstructor = $this->createUser([
            'name' => 'Maksym Backend',
            'nickname' => 'maksym-backend',
            'bio' => 'Backend engineer who teaches API design, testing, and secure Laravel workflows.',
            'email' => 'backend@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $frontendInstructor = $this->createUser([
            'name' => 'Ira Frontend',
            'nickname' => 'ira-frontend',
            'bio' => 'Frontend developer focused on course dashboards, accessible UI, and design systems.',
            'email' => 'frontend@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $mlInstructor = $this->createUser([
            'name' => 'Taras ML',
            'nickname' => 'taras-ml',
            'bio' => 'Machine learning mentor who likes practical notebooks, clean datasets, and reproducible pipelines.',
            'email' => 'ml@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $devopsInstructor = $this->createUser([
            'name' => 'Oleh DevOps',
            'email' => 'devops@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $extraInstructor = $this->createUser([
            'name' => 'Nadia CourseOps',
            'email' => 'courses@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
        ]);

        $designInstructor = $this->createUser([
            'name' => 'Svitlana Design',
            'email' => 'design@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
            'bio' => 'UX/UI designer specializing in educational interfaces and accessibility.',
        ]);

        $dataScienceInstructor = $this->createUser([
            'name' => 'Volodymyr DataScience',
            'email' => 'datascience@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
            'bio' => 'Data scientist focusing on analytics, visualization, and statistical modeling.',
        ]);

        $mobileInstructor = $this->createUser([
            'name' => 'Kateryna Mobile',
            'email' => 'mobile@techtutor.test',
            'password' => $password,
            'role' => 'instructor',
            'bio' => 'Mobile developer expert in React Native and Flutter for educational apps.',
        ]);

        $student = $this->createUser([
            'name' => 'Iryna Student',
            'email' => 'student@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $secondStudent = $this->createUser([
            'name' => 'Taras Student',
            'email' => 'student2@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $bannedStudent = $this->createUser([
            'name' => 'Blocked Student',
            'email' => 'banned@techtutor.test',
            'password' => $password,
            'role' => 'student',
            'is_banned' => true,
            'banned_at' => now()->subDay(),
        ]);

        $student3 = $this->createUser([
            'name' => 'Olga Learner',
            'email' => 'student3@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student4 = $this->createUser([
            'name' => 'Dmytro StudyBuddy',
            'email' => 'student4@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student5 = $this->createUser([
            'name' => 'Ivanna KnowledgeSeeker',
            'email' => 'student5@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student6 = $this->createUser([
            'name' => 'Andrii SkillBuilder',
            'email' => 'student6@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student7 = $this->createUser([
            'name' => 'Yuliya CourseExplorer',
            'email' => 'student7@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student8 = $this->createUser([
            'name' => 'Ruslan EducationFan',
            'email' => 'student8@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student9 = $this->createUser([
            'name' => 'Liliya StudyPartner',
            'email' => 'student9@techtutor.test',
            'password' => $password,
            'role' => 'student',
        ]);

        $student10 = $this->createUser([
            'name' => 'Mykhailo LifelongLearner',
            'email' => 'student10@techtutor.test',
            'password' => $password,
            'role' => 'student',
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
            $tagIds['javascript'],
            $tagIds['typescript'],
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
            $tagIds['data'],
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
            $tagIds['monitoring'],
            $tagIds['devops'],
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
            $tagIds['testing'],
        ]);

        $designCourse = Course::create([
            'instructor_id' => $designInstructor->id,
            'title' => 'User Experience Design Fundamentals',
            'slug' => 'ux-design-fundamentals',
            'description' => 'Learn the principles of user-centered design, wireframing, prototyping, and usability testing for digital products.',
            'subtitle' => 'Create intuitive and accessible user interfaces',
            'category' => 'frontend',
            'level' => 'beginner',
            'language' => 'en',
            'what_you_will_learn' => [
                'Conduct user research and create personas',
                'Design wireframes and interactive prototypes',
                'Apply accessibility guidelines (WCAG)',
                'Run usability tests and iterate on designs',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 240,
            'price' => 49.00,
            'is_published' => true,
            'published_at' => now()->subDays(15),
        ]);

        $designCourse->tags()->sync([
            $tagIds['ux'],
            $tagIds['figma'],
            $tagIds['accessibility'],
        ]);

        $dataScienceCourse = Course::create([
            'instructor_id' => $dataScienceInstructor->id,
            'title' => 'Data Analysis with Python',
            'slug' => 'data-analysis-python',
            'description' => 'Master data manipulation, visualization, and statistical analysis using Python libraries like Pandas, NumPy, and Matplotlib.',
            'subtitle' => 'Turn data into insights with Python',
            'category' => 'ml/ai',
            'level' => 'intermediate',
            'language' => 'en',
            'what_you_will_learn' => [
                'Clean and manipulate data with Pandas',
                'Create visualizations with Matplotlib and Seaborn',
                'Perform statistical analysis and hypothesis testing',
                'Build predictive models with Scikit-learn',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 300,
            'price' => 75.00,
            'is_published' => true,
            'published_at' => now()->subDays(12),
        ]);

        $dataScienceCourse->tags()->sync([
            $tagIds['python'],
            $tagIds['machine-learning'],
            $tagIds['pandas'],
            $tagIds['visualization'],
        ]);

        $mobileCourse = Course::create([
            'instructor_id' => $mobileInstructor->id,
            'title' => 'Cross-Platform Mobile Development',
            'slug' => 'cross-platform-mobile',
            'description' => 'Build native mobile apps for iOS and Android using React Native and Expo.',
            'subtitle' => 'Create mobile apps with shared codebase',
            'category' => 'frontend',
            'level' => 'intermediate',
            'language' => 'en',
            'what_you_will_learn' => [
                'Set up React Native development environment',
                'Create responsive layouts with Flexbox',
                'Access device features like camera and GPS',
                'Publish apps to App Store and Google Play',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 360,
            'price' => 85.00,
            'is_published' => true,
            'published_at' => now()->subDays(10),
        ]);

        $mobileCourse->tags()->sync([
            $tagIds['react'],
            $tagIds['react-native'],
            $tagIds['mobile'],
        ]);

        $cloudCourse = Course::create([
            'instructor_id' => $devopsInstructor->id,
            'title' => 'Cloud Architecture with AWS',
            'slug' => 'cloud-architecture-aws',
            'description' => 'Design and deploy scalable, fault-tolerant applications on Amazon Web Services.',
            'subtitle' => 'Build resilient systems in the cloud',
            'category' => 'devops',
            'level' => 'advanced',
            'language' => 'en',
            'what_you_will_learn' => [
                'Architect applications using AWS Well-Architected Framework',
                'Implement infrastructure as code with Terraform',
                'Configure load balancing and auto-scaling',
                'Monitor and optimize cloud costs',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 420,
            'price' => 95.00,
            'is_published' => true,
            'published_at' => now()->subDays(8),
        ]);

        $cloudCourse->tags()->sync([
            $tagIds['docker'],
            $tagIds['kubernetes'],
            $tagIds['aws'],
            $tagIds['terraform'],
        ]);

        $cybersecurityCourse = Course::create([
            'instructor_id' => $backendInstructor->id,
            'title' => 'Cybersecurity Fundamentals',
            'slug' => 'cybersecurity-fundamentals',
            'description' => 'Learn essential cybersecurity concepts, threat modeling, and defensive security practices.',
            'subtitle' => 'Protect systems and data from cyber threats',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'what_you_will_learn' => [
                'Identify common vulnerabilities and attack vectors',
                'Implement authentication and authorization systems',
                'Apply encryption and secure communication protocols',
                'Conduct security audits and penetration testing',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 390,
            'price' => 110.00,
            'is_published' => true,
            'published_at' => now()->subDays(6),
        ]);

        $cybersecurityCourse->tags()->sync([
            $tagIds['api'],
            $tagIds['sanctum'],
            $tagIds['security'],
        ]);

        $blockchainCourse = Course::create([
            'instructor_id' => $mlInstructor->id,
            'title' => 'Blockchain Development Essentials',
            'slug' => 'blockchain-development',
            'description' => 'Build decentralized applications using Ethereum and smart contracts.',
            'subtitle' => 'Create dApps with Solidity and Web3.js',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'what_you_will_learn' => [
                'Understand blockchain fundamentals and consensus mechanisms',
                'Write and deploy smart contracts with Solidity',
                'Interact with blockchain using Web3.js and Ethers.js',
                'Build full-stack decentralized applications',
            ],
            'thumbnail_path' => null,
            'duration_minutes' => 450,
            'price' => 120.00,
            'is_published' => true,
            'published_at' => now()->subDays(4),
        ]);

        $blockchainCourse->tags()->sync([
            $tagIds['docker'],
            $tagIds['ci-cd'],
            $tagIds['solidity'],
            $tagIds['web3'],
        ]);

        // Modules for Design Course
        $designBasics = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'Design Basics',
            'slug' => 'design-basics',
            'position' => 1,
        ]);

        $designProcess = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'Design Process',
            'slug' => 'design-process',
            'position' => 2,
        ]);

        // Modules for Data Science Course
        $dataManipulation = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Data Manipulation',
            'slug' => 'data-manipulation',
            'position' => 1,
        ]);

        $dataVisualization = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Data Visualization',
            'slug' => 'data-visualization',
            'position' => 2,
        ]);

        // Modules for Mobile Course
        $mobileSetup = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'Environment Setup',
            'slug' => 'environment-setup',
            'position' => 1,
        ]);

        $mobileComponents = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'Building Components',
            'slug' => 'building-components',
            'position' => 2,
        ]);

        // Modules for Cloud Course
        $cloudFundamentals = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'Cloud Fundamentals',
            'slug' => 'cloud-fundamentals',
            'position' => 1,
        ]);

        $cloudServices = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'AWS Core Services',
            'slug' => 'aws-core-services',
            'position' => 2,
        ]);

        // Modules for Cybersecurity Course
        $securityBasics = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Security Basics',
            'slug' => 'security-basics',
            'position' => 1,
        ]);

        $threatModeling = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Threat Modeling',
            'slug' => 'threat-modeling',
            'position' => 2,
        ]);

        // Modules for Blockchain Course
        $blockchainIntro = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'Blockchain Introduction',
            'slug' => 'blockchain-introduction',
            'position' => 1,
        ]);

        $smartContracts = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'Smart Contracts Development',
            'slug' => 'smart-contracts-development',
            'position' => 2,
        ]);

        // Modules for React Course
        $reactComponents = Module::create([
            'course_id' => $reactCourse->id,
            'title' => 'Component Patterns',
            'slug' => 'component-patterns',
            'position' => 2,
        ]);

        $reactState = Module::create([
            'course_id' => $reactCourse->id,
            'title' => 'State Management',
            'slug' => 'state-management',
            'position' => 3,
        ]);

        $reactTesting = Module::create([
            'course_id' => $reactCourse->id,
            'title' => 'Testing & Optimization',
            'slug' => 'testing-optimization',
            'position' => 4,
        ]);

        $reactAdvanced = Module::create([
            'course_id' => $reactCourse->id,
            'title' => 'Advanced Patterns',
            'slug' => 'advanced-patterns',
            'position' => 5,
        ]);

        $mlDeployment = Module::create([
            'course_id' => $mlCourse->id,
            'title' => 'Model Training & Evaluation',
            'slug' => 'model-training-evaluation',
            'position' => 2,
        ]);

        $mlApiPackaging = Module::create([
            'course_id' => $mlCourse->id,
            'title' => 'API Packaging & Deployment',
            'slug' => 'api-packaging-deployment',
            'position' => 3,
        ]);

        $mlMonitoring = Module::create([
            'course_id' => $mlCourse->id,
            'title' => 'Monitoring & Maintenance',
            'slug' => 'monitoring-maintenance',
            'position' => 4,
        ]);

        $mlProduction = Module::create([
            'course_id' => $mlCourse->id,
            'title' => 'Production Best Practices',
            'slug' => 'production-best-practices',
            'position' => 5,
        ]);

        $devopsIaC = Module::create([
            'course_id' => $devopsCourse->id,
            'title' => 'Infrastructure as Code',
            'slug' => 'infrastructure-as-code',
            'position' => 2,
        ]);

        $devopsMonitoring = Module::create([
            'course_id' => $devopsCourse->id,
            'title' => 'Monitoring & Observability',
            'slug' => 'monitoring-observability',
            'position' => 3,
        ]);

        $devopsSecurity = Module::create([
            'course_id' => $devopsCourse->id,
            'title' => 'Security & Compliance',
            'slug' => 'security-compliance',
            'position' => 4,
        ]);

        $devopsScaling = Module::create([
            'course_id' => $devopsCourse->id,
            'title' => 'Scaling & Cost Optimization',
            'slug' => 'scaling-cost-optimization',
            'position' => 5,
        ]);

        // Modules for Design Course
        $designResearch = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'User Research',
            'slug' => 'user-research',
            'position' => 3,
        ]);

        $designTools = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'Design Tools & Workflows',
            'slug' => 'design-tools-workflows',
            'position' => 4,
        ]);

        $designPrototyping = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'Prototyping & Testing',
            'slug' => 'prototyping-testing',
            'position' => 5,
        ]);

        $designSystems = Module::create([
            'course_id' => $designCourse->id,
            'title' => 'Design Systems',
            'slug' => 'design-systems',
            'position' => 6,
        ]);

        // Modules for Data Science Course
        $dataFeatureEng = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Feature Engineering',
            'slug' => 'feature-engineering',
            'position' => 3,
        ]);

        $dataStats = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Statistical Analysis',
            'slug' => 'statistical-analysis',
            'position' => 4,
        ]);

        $dataModeling = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Predictive Modeling',
            'slug' => 'predictive-modeling',
            'position' => 5,
        ]);

        $dataReporting = Module::create([
            'course_id' => $dataScienceCourse->id,
            'title' => 'Reporting & Dashboards',
            'slug' => 'reporting-dashboards',
            'position' => 6,
        ]);

        // Modules for Mobile Course
        $mobileNavigation = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'Navigation & Routing',
            'slug' => 'navigation-routing',
            'position' => 3,
        ]);

        $mobileState = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'State Management',
            'slug' => 'mobile-state-management',
            'position' => 4,
        ]);

        $mobileNative = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'Native Device Features',
            'slug' => 'native-device-features',
            'position' => 5,
        ]);

        $mobilePublishing = Module::create([
            'course_id' => $mobileCourse->id,
            'title' => 'Publishing & Distribution',
            'slug' => 'publishing-distribution',
            'position' => 6,
        ]);

        // Modules for Cloud Course
        $cloudIaC = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'Infrastructure as Code on AWS',
            'slug' => 'infrastructure-as-code-aws',
            'position' => 3,
        ]);

        $cloudSecurity = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'Cloud Security',
            'slug' => 'cloud-security',
            'position' => 4,
        ]);

        $cloudCost = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'Cost Optimization',
            'slug' => 'cost-optimization',
            'position' => 5,
        ]);

        $cloudDisaster = Module::create([
            'course_id' => $cloudCourse->id,
            'title' => 'Disaster Recovery',
            'slug' => 'disaster-recovery',
            'position' => 6,
        ]);

        // Modules for Cybersecurity Course
        $securityCrypto = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Cryptography',
            'slug' => 'cryptography',
            'position' => 3,
        ]);

        $securityNetwork = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Network Security',
            'slug' => 'network-security',
            'position' => 4,
        ]);

        $securityAppSec = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Application Security',
            'slug' => 'application-security',
            'position' => 5,
        ]);

        $securityCompliance = Module::create([
            'course_id' => $cybersecurityCourse->id,
            'title' => 'Compliance & Auditing',
            'slug' => 'compliance-auditing',
            'position' => 6,
        ]);

        // Modules for Blockchain Course
        $blockchainSolidity = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'Advanced Solidity',
            'slug' => 'advanced-solidity',
            'position' => 3,
        ]);

        $blockchainWeb3 = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'Web3 Integration',
            'slug' => 'web3-integration',
            'position' => 4,
        ]);

        $blockchainSecurity = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'Smart Contract Security',
            'slug' => 'smart-contract-security',
            'position' => 5,
        ]);

        $blockchainDeFi = Module::create([
            'course_id' => $blockchainCourse->id,
            'title' => 'DeFi & Tokenomics',
            'slug' => 'defi-tokenomics',
            'position' => 6,
        ]);

        // Modules for Draft Course
        $draftAdvancedTesting = Module::create([
            'course_id' => $draftCourse->id,
            'title' => 'Advanced Testing',
            'slug' => 'advanced-testing',
            'position' => 2,
        ]);

        $draftFixtures = Module::create([
            'course_id' => $draftCourse->id,
            'title' => 'Fixtures & Edge Cases',
            'slug' => 'fixtures-edge-cases',
            'position' => 3,
        ]);

        $draftCoverage = Module::create([
            'course_id' => $draftCourse->id,
            'title' => 'Coverage & Reporting',
            'slug' => 'coverage-reporting',
            'position' => 4,
        ]);

        $draftComplexFlows = Module::create([
            'course_id' => $draftCourse->id,
            'title' => 'Complex Flow Testing',
            'slug' => 'complex-flow-testing',
            'position' => 5,
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

        // Lessons for Design Course
        $designBasicsLesson = Lesson::create([
            'module_id' => $designBasics->id,
            'title' => 'Introduction to UX Design',
            'slug' => 'introduction-to-ux-design',
            'type' => 'lesson',
            'content' => 'Learn the fundamentals of user experience design, including user research, personas, and information architecture.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $designProcessLesson = Lesson::create([
            'module_id' => $designProcess->id,
            'title' => 'Wireframing and Prototyping',
            'slug' => 'wireframing-and-prototyping',
            'type' => 'lesson',
            'content' => 'Create wireframes and interactive prototypes using industry-standard tools like Figma and Sketch.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        // Lessons for Data Science Course
        $dataManipulationLesson = Lesson::create([
            'module_id' => $dataManipulation->id,
            'title' => 'Data Manipulation with Pandas',
            'slug' => 'data-manipulation-with-pandas',
            'type' => 'lesson',
            'content' => 'Learn to clean, transform, and manipulate data using Pandas DataFrame and Series objects.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $dataVisualizationLesson = Lesson::create([
            'module_id' => $dataVisualization->id,
            'title' => 'Data Visualization Techniques',
            'slug' => 'data-visualization-techniques',
            'type' => 'lesson',
            'content' => 'Create effective visualizations using Matplotlib, Seaborn, and Plotly to communicate insights from data.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        // Lessons for Mobile Course
        $mobileSetupLesson = Lesson::create([
            'module_id' => $mobileSetup->id,
            'title' => 'Setting Up React Native',
            'slug' => 'setting-up-react-native',
            'type' => 'lesson',
            'content' => 'Install and configure React Native development environment for iOS and Android development.',
            'video_url' => null,
            'estimated_time_minutes' => 20,
            'position' => 1,
            'is_published' => true,
        ]);

        $mobileComponentsLesson = Lesson::create([
            'module_id' => $mobileComponents->id,
            'title' => 'Building Mobile Components',
            'slug' => 'building-mobile-components',
            'type' => 'lesson',
            'content' => 'Create reusable UI components using React Native and learn about navigation between screens.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 2,
            'is_published' => true,
        ]);

        // Lessons for Cloud Course
        $cloudFundamentalsLesson = Lesson::create([
            'module_id' => $cloudFundamentals->id,
            'title' => 'Cloud Computing Fundamentals',
            'slug' => 'cloud-computing-fundamentals',
            'type' => 'lesson',
            'content' => 'Understand cloud computing concepts, service models (IaaS, PaaS, SaaS), and deployment models.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $cloudServicesLesson = Lesson::create([
            'module_id' => $cloudServices->id,
            'title' => 'AWS Core Services Overview',
            'slug' => 'aws-core-services-overview',
            'type' => 'lesson',
            'content' => 'Explore essential AWS services including EC2, S3, RDS, Lambda, and VPC.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        // Lessons for Cybersecurity Course
        $securityBasicsLesson = Lesson::create([
            'module_id' => $securityBasics->id,
            'title' => 'Cybersecurity Fundamentals',
            'slug' => 'cybersecurity-fundamentals',
            'type' => 'lesson',
            'content' => 'Learn basic cybersecurity concepts, threats, vulnerabilities, and risk management principles.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $threatModelingLesson = Lesson::create([
            'module_id' => $threatModeling->id,
            'title' => 'Threat Modeling Methodologies',
            'slug' => 'threat-modeling-methodologies',
            'type' => 'lesson',
            'content' => 'Learn to identify, quantify, and address security risks using threat modeling frameworks like STRIDE and PASTA.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 2,
            'is_published' => true,
        ]);

        // Lessons for Blockchain Course
        $blockchainIntroLesson = Lesson::create([
            'module_id' => $blockchainIntro->id,
            'title' => 'Blockchain Technology Overview',
            'slug' => 'blockchain-technology-overview',
            'type' => 'lesson',
            'content' => 'Understand blockchain fundamentals, distributed ledger technology, and how cryptocurrencies work.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $smartContractsLesson = Lesson::create([
            'module_id' => $smartContracts->id,
            'title' => 'Smart Contracts Development with Solidity',
            'slug' => 'smart-contracts-development-with-solidity',
            'type' => 'lesson',
            'content' => 'Learn to write, test, and deploy smart contracts using Solidity programming language.',
            'video_url' => null,
            'estimated_time_minutes' => 40,
            'position' => 2,
            'is_published' => true,
        ]);

        $reactComponentsLesson1 = Lesson::create([
            'module_id' => $reactComponents->id,
            'title' => 'Reusable Component Patterns',
            'slug' => 'reusable-component-patterns',
            'type' => 'lesson',
            'content' => 'Build composable UI pieces that share behavior and styling without duplication.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 1,
            'is_published' => true,
        ]);

        $reactComponentsLesson2 = Lesson::create([
            'module_id' => $reactComponents->id,
            'title' => 'Compound Components',
            'slug' => 'compound-components',
            'type' => 'lesson',
            'content' => 'Create flexible component APIs that manage shared state through context and composition.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 2,
            'is_published' => true,
        ]);

        $reactStateLesson1 = Lesson::create([
            'module_id' => $reactState->id,
            'title' => 'Redux Toolkit & Zustand',
            'slug' => 'redux-toolkit-zustand',
            'type' => 'lesson',
            'content' => 'Compare modern global state libraries and set up scalable stores for LMS dashboards.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $reactStateLesson2 = Lesson::create([
            'module_id' => $reactState->id,
            'title' => 'Server State with React Query',
            'slug' => 'server-state-react-query',
            'type' => 'lesson',
            'content' => 'Cache, synchronize, and update async server data using TanStack Query patterns.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $reactTestingLesson1 = Lesson::create([
            'module_id' => $reactTesting->id,
            'title' => 'Unit Testing with Jest & React Testing Library',
            'slug' => 'unit-testing-jest-rtl',
            'type' => 'lesson',
            'content' => 'Write focused component tests that assert behavior rather than implementation details.',
            'video_url' => null,
            'estimated_time_minutes' => 40,
            'position' => 1,
            'is_published' => true,
        ]);

        $reactTestingLesson2 = Lesson::create([
            'module_id' => $reactTesting->id,
            'title' => 'Performance Optimization',
            'slug' => 'performance-optimization',
            'type' => 'lesson',
            'content' => 'Use memoization, code splitting, and profiling to keep LMS screens responsive.',
            'video_url' => null,
            'estimated_time_minutes' => 33,
            'position' => 2,
            'is_published' => true,
        ]);

        $reactAdvancedLesson1 = Lesson::create([
            'module_id' => $reactAdvanced->id,
            'title' => 'Render Props & Higher-Order Components',
            'slug' => 'render-props-hoc',
            'type' => 'lesson',
            'content' => 'Understand legacy patterns for cross-cutting concerns and when to replace them with hooks.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $reactAdvancedLesson2 = Lesson::create([
            'module_id' => $reactAdvanced->id,
            'title' => 'Micro-Frontends Architecture',
            'slug' => 'micro-frontends-architecture',
            'type' => 'lesson',
            'content' => 'Split large LMS frontends into independently deployable module boundaries.',
            'video_url' => null,
            'estimated_time_minutes' => 38,
            'position' => 2,
            'is_published' => true,
        ]);

        $mlDeploymentLesson1 = Lesson::create([
            'module_id' => $mlDeployment->id,
            'title' => 'Cross-Validation Strategies',
            'slug' => 'cross-validation-strategies',
            'type' => 'lesson',
            'content' => 'Apply k-fold and stratified splits to measure model generalization reliably.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $mlDeploymentLesson2 = Lesson::create([
            'module_id' => $mlDeployment->id,
            'title' => 'Model Evaluation Metrics',
            'slug' => 'model-evaluation-metrics',
            'type' => 'lesson',
            'content' => 'Select precision, recall, F1, and ROC curves based on business constraints.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $mlApiPackagingLesson1 = Lesson::create([
            'module_id' => $mlApiPackaging->id,
            'title' => 'FastAPI & Flask wrappers',
            'slug' => 'fastapi-flask-wrappers',
            'type' => 'lesson',
            'content' => 'Wrap trained models in lightweight REST endpoints ready for frontend consumption.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $mlApiPackagingLesson2 = Lesson::create([
            'module_id' => $mlApiPackaging->id,
            'title' => 'Dockerizing ML Models',
            'slug' => 'dockerizing-ml-models',
            'type' => 'lesson',
            'content' => 'Containerize model serving code with dependencies and environment variables.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 2,
            'is_published' => true,
        ]);

        $mlMonitoringLesson1 = Lesson::create([
            'module_id' => $mlMonitoring->id,
            'title' => 'Drift Detection',
            'slug' => 'drift-detection',
            'type' => 'lesson',
            'content' => 'Monitor input and prediction drift to trigger retraining before accuracy drops.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 1,
            'is_published' => true,
        ]);

        $mlMonitoringLesson2 = Lesson::create([
            'module_id' => $mlMonitoring->id,
            'title' => 'Logging & Alerting',
            'slug' => 'logging-alerting',
            'type' => 'lesson',
            'content' => 'Emit structured logs and configure alerts for inference latency and error rates.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 2,
            'is_published' => true,
        ]);

        $mlProductionLesson1 = Lesson::create([
            'module_id' => $mlProduction->id,
            'title' => 'CI/CD for ML Pipelines',
            'slug' => 'cicd-ml-pipelines',
            'type' => 'lesson',
            'content' => 'Automate training, validation, and deployment with pipeline orchestration.',
            'video_url' => null,
            'estimated_time_minutes' => 36,
            'position' => 1,
            'is_published' => true,
        ]);

        $mlProductionLesson2 = Lesson::create([
            'module_id' => $mlProduction->id,
            'title' => 'Model Versioning with MLflow',
            'slug' => 'model-versioning-mlflow',
            'type' => 'lesson',
            'content' => 'Track experiments, register models, and promote versions across environments.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $devopsIaCLesson1 = Lesson::create([
            'module_id' => $devopsIaC->id,
            'title' => 'Terraform Fundamentals',
            'slug' => 'terraform-fundamentals',
            'type' => 'lesson',
            'content' => 'Provision cloud resources declaratively with providers, state files, and modules.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $devopsIaCLesson2 = Lesson::create([
            'module_id' => $devopsIaC->id,
            'title' => 'Ansible Configuration Management',
            'slug' => 'ansible-configuration-management',
            'type' => 'lesson',
            'content' => 'Automate server setup, package installation, and configuration drift correction.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $devopsMonitoringLesson1 = Lesson::create([
            'module_id' => $devopsMonitoring->id,
            'title' => 'Prometheus & Grafana Setup',
            'slug' => 'prometheus-grafana-setup',
            'type' => 'lesson',
            'content' => 'Collect metrics, build dashboards, and set alerting rules for production services.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $devopsMonitoringLesson2 = Lesson::create([
            'module_id' => $devopsMonitoring->id,
            'title' => 'Distributed Tracing with Jaeger',
            'slug' => 'distributed-tracing-jaeger',
            'type' => 'lesson',
            'content' => 'Trace requests across microservices to pinpoint latency bottlenecks.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $devopsSecurityLesson1 = Lesson::create([
            'module_id' => $devopsSecurity->id,
            'title' => 'Secrets Management',
            'slug' => 'secrets-management',
            'type' => 'lesson',
            'content' => 'Store and inject credentials safely using vaults and environment segregation.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $devopsSecurityLesson2 = Lesson::create([
            'module_id' => $devopsSecurity->id,
            'title' => 'Container Security Scanning',
            'slug' => 'container-security-scanning',
            'type' => 'lesson',
            'content' => 'Scan images for vulnerabilities, enforce policies, and minimize attack surface.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 2,
            'is_published' => true,
        ]);

        $devopsScalingLesson1 = Lesson::create([
            'module_id' => $devopsScaling->id,
            'title' => 'Auto-Scaling Policies',
            'slug' => 'auto-scaling-policies',
            'type' => 'lesson',
            'content' => 'Configure target tracking and scheduled scaling to balance cost and performance.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $devopsScalingLesson2 = Lesson::create([
            'module_id' => $devopsScaling->id,
            'title' => 'Cost Monitoring & Budget Alerts',
            'slug' => 'cost-monitoring-budget-alerts',
            'type' => 'lesson',
            'content' => 'Track spend by service, set budgets, and receive alerts before overruns.',
            'video_url' => null,
            'estimated_time_minutes' => 24,
            'position' => 2,
            'is_published' => true,
        ]);

        $designResearchLesson1 = Lesson::create([
            'module_id' => $designResearch->id,
            'title' => 'Conducting User Interviews',
            'slug' => 'conducting-user-interviews',
            'type' => 'lesson',
            'content' => 'Plan scripts, run sessions, and synthesize insights into actionable design decisions.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 1,
            'is_published' => true,
        ]);

        $designResearchLesson2 = Lesson::create([
            'module_id' => $designResearch->id,
            'title' => 'Creating Personas & Journey Maps',
            'slug' => 'creating-personas-journey-maps',
            'type' => 'lesson',
            'content' => 'Translate research into personas and map end-to-end learning experiences.',
            'video_url' => null,
            'estimated_time_minutes' => 26,
            'position' => 2,
            'is_published' => true,
        ]);

        $designToolsLesson1 = Lesson::create([
            'module_id' => $designTools->id,
            'title' => 'Advanced Figma Techniques',
            'slug' => 'advanced-figma-techniques',
            'type' => 'lesson',
            'content' => 'Use components, variants, and auto-layout to build scalable LMS interface files.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $designToolsLesson2 = Lesson::create([
            'module_id' => $designTools->id,
            'title' => 'Design System Documentation',
            'slug' => 'design-system-documentation',
            'type' => 'lesson',
            'content' => 'Document tokens, patterns, and usage rules so teams ship consistent UI.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 2,
            'is_published' => true,
        ]);

        $designPrototypingLesson1 = Lesson::create([
            'module_id' => $designPrototyping->id,
            'title' => 'Interactive Prototyping',
            'slug' => 'interactive-prototyping',
            'type' => 'lesson',
            'content' => 'Create clickable prototypes that simulate real course flows and feedback loops.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $designPrototypingLesson2 = Lesson::create([
            'module_id' => $designPrototyping->id,
            'title' => 'Usability Testing Methods',
            'slug' => 'usability-testing-methods',
            'type' => 'lesson',
            'content' => 'Run moderated and unmoderated tests to uncover friction in learning journeys.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 2,
            'is_published' => true,
        ]);

        $designSystemsLesson1 = Lesson::create([
            'module_id' => $designSystems->id,
            'title' => 'Building Scalable Design Systems',
            'slug' => 'building-scalable-design-systems',
            'type' => 'lesson',
            'content' => 'Define tokens, layers, and governance to keep educational products coherent.',
            'video_url' => null,
            'estimated_time_minutes' => 34,
            'position' => 1,
            'is_published' => true,
        ]);

        $designSystemsLesson2 = Lesson::create([
            'module_id' => $designSystems->id,
            'title' => 'Component Library Management',
            'slug' => 'component-library-management',
            'type' => 'lesson',
            'content' => 'Version, publish, and maintain shared UI components across multiple teams.',
            'video_url' => null,
            'estimated_time_minutes' => 29,
            'position' => 2,
            'is_published' => true,
        ]);

        $dataFeatureEngLesson1 = Lesson::create([
            'module_id' => $dataFeatureEng->id,
            'title' => 'Feature Selection Methods',
            'slug' => 'feature-selection-methods',
            'type' => 'lesson',
            'content' => 'Use filters, wrappers, and embedded methods to keep the most predictive variables.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $dataFeatureEngLesson2 = Lesson::create([
            'module_id' => $dataFeatureEng->id,
            'title' => 'Encoding & Transformation Techniques',
            'slug' => 'encoding-transformation-techniques',
            'type' => 'lesson',
            'content' => 'Apply one-hot encoding, target encoding, and power transforms for model readiness.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $dataStatsLesson1 = Lesson::create([
            'module_id' => $dataStats->id,
            'title' => 'Hypothesis Testing',
            'slug' => 'hypothesis-testing',
            'type' => 'lesson',
            'content' => 'Frame null hypotheses, choose test types, and interpret p-values in course analytics.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $dataStatsLesson2 = Lesson::create([
            'module_id' => $dataStats->id,
            'title' => 'Regression Analysis',
            'slug' => 'regression-analysis',
            'type' => 'lesson',
            'content' => 'Model relationships between learner behavior and outcome metrics with linear and logistic regression.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 2,
            'is_published' => true,
        ]);

        $dataModelingLesson1 = Lesson::create([
            'module_id' => $dataModeling->id,
            'title' => 'Supervised vs Unsupervised Learning',
            'slug' => 'supervised-vs-unsupervised-learning',
            'type' => 'lesson',
            'content' => 'Choose the right paradigm for labeling availability and business questions.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 1,
            'is_published' => true,
        ]);

        $dataModelingLesson2 = Lesson::create([
            'module_id' => $dataModeling->id,
            'title' => 'Model Tuning & Hyperparameter Optimization',
            'slug' => 'model-tuning-hyperparameter-optimization',
            'type' => 'lesson',
            'content' => 'Use grid search, random search, and Bayesian methods to squeeze out performance.',
            'video_url' => null,
            'estimated_time_minutes' => 34,
            'position' => 2,
            'is_published' => true,
        ]);

        $dataReportingLesson1 = Lesson::create([
            'module_id' => $dataReporting->id,
            'title' => 'Building Dashboards with Plotly',
            'slug' => 'building-dashboards-plotly',
            'type' => 'lesson',
            'content' => 'Create interactive charts and dashboards that instructors can use for cohort review.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $dataReportingLesson2 = Lesson::create([
            'module_id' => $dataReporting->id,
            'title' => 'Automated Reporting with Python',
            'slug' => 'automated-reporting-python',
            'type' => 'lesson',
            'content' => 'Schedule email and PDF reports that summarize learner progress and engagement.',
            'video_url' => null,
            'estimated_time_minutes' => 26,
            'position' => 2,
            'is_published' => true,
        ]);

        $mobileNavigationLesson1 = Lesson::create([
            'module_id' => $mobileNavigation->id,
            'title' => 'React Navigation Deep Dives',
            'slug' => 'react-navigation-deep-dives',
            'type' => 'lesson',
            'content' => 'Configure nested navigators, deep links, and type-safe route params.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $mobileNavigationLesson2 = Lesson::create([
            'module_id' => $mobileNavigation->id,
            'title' => 'Tab & Drawer Navigation Patterns',
            'slug' => 'tab-drawer-navigation-patterns',
            'type' => 'lesson',
            'content' => 'Implement common navigation structures for student and instructor mobile views.',
            'video_url' => null,
            'estimated_time_minutes' => 26,
            'position' => 2,
            'is_published' => true,
        ]);

        $mobileStateLesson1 = Lesson::create([
            'module_id' => $mobileState->id,
            'title' => 'Redux & Context API for Mobile',
            'slug' => 'redux-context-api-mobile',
            'type' => 'lesson',
            'content' => 'Share auth and course state across screens with predictable state containers.',
            'video_url' => null,
            'estimated_time_minutes' => 33,
            'position' => 1,
            'is_published' => true,
        ]);

        $mobileStateLesson2 = Lesson::create([
            'module_id' => $mobileState->id,
            'title' => 'Async Storage & Data Persistence',
            'slug' => 'async-storage-data-persistence',
            'type' => 'lesson',
            'content' => 'Persist preferences and offline progress using secure storage and encryption.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $mobileNativeLesson1 = Lesson::create([
            'module_id' => $mobileNative->id,
            'title' => 'Camera, GPS & Sensors',
            'slug' => 'camera-gps-sensors',
            'type' => 'lesson',
            'content' => 'Access device hardware for photo uploads, location-aware content, and interactivity.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $mobileNativeLesson2 = Lesson::create([
            'module_id' => $mobileNative->id,
            'title' => 'Push Notifications Setup',
            'slug' => 'push-notifications-setup',
            'type' => 'lesson',
            'content' => 'Configure FCM and APNs to deliver course reminders and engagement nudges.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $mobilePublishingLesson1 = Lesson::create([
            'module_id' => $mobilePublishing->id,
            'title' => 'App Store Submission Guide',
            'slug' => 'app-store-submission-guide',
            'type' => 'lesson',
            'content' => 'Prepare binaries, metadata, and compliance artifacts for Apple and Google stores.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $mobilePublishingLesson2 = Lesson::create([
            'module_id' => $mobilePublishing->id,
            'title' => 'Over-the-Air Updates with Expo',
            'slug' => 'over-the-air-updates-expo',
            'type' => 'lesson',
            'content' => 'Deploy JS bundle updates without full store reviews using OTA channels.',
            'video_url' => null,
            'estimated_time_minutes' => 24,
            'position' => 2,
            'is_published' => true,
        ]);

        $cloudIaCLesson1 = Lesson::create([
            'module_id' => $cloudIaC->id,
            'title' => 'Terraform for AWS',
            'slug' => 'terraform-for-aws',
            'type' => 'lesson',
            'content' => 'Write reusable Terraform modules for VPCs, subnets, and managed services.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $cloudIaCLesson2 = Lesson::create([
            'module_id' => $cloudIaC->id,
            'title' => 'CloudFormation Templates',
            'slug' => 'cloudformation-templates',
            'type' => 'lesson',
            'content' => 'Define infrastructure as JSON/YAML stacks and compare them to Terraform workflows.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $cloudSecurityLesson1 = Lesson::create([
            'module_id' => $cloudSecurity->id,
            'title' => 'IAM Policies & Roles',
            'slug' => 'iam-policies-roles',
            'type' => 'lesson',
            'content' => 'Design least-privilege access with users, groups, roles, and policy conditions.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $cloudSecurityLesson2 = Lesson::create([
            'module_id' => $cloudSecurity->id,
            'title' => 'Encryption & Key Management',
            'slug' => 'encryption-key-management',
            'type' => 'lesson',
            'content' => 'Protect data at rest and in transit using KMS, certificates, and envelope encryption.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $cloudCostLesson1 = Lesson::create([
            'module_id' => $cloudCost->id,
            'title' => 'AWS Cost Explorer',
            'slug' => 'aws-cost-explorer',
            'type' => 'lesson',
            'content' => 'Analyze spend by service, tag, and time period to identify optimization targets.',
            'video_url' => null,
            'estimated_time_minutes' => 25,
            'position' => 1,
            'is_published' => true,
        ]);

        $cloudCostLesson2 = Lesson::create([
            'module_id' => $cloudCost->id,
            'title' => 'Reserved Instances & Savings Plans',
            'slug' => 'reserved-instances-savings-plans',
            'type' => 'lesson',
            'content' => 'Commit to baseline usage with flexible discounts while keeping elasticity for peaks.',
            'video_url' => null,
            'estimated_time_minutes' => 26,
            'position' => 2,
            'is_published' => true,
        ]);

        $cloudDisasterLesson1 = Lesson::create([
            'module_id' => $cloudDisaster->id,
            'title' => 'Backup Strategies',
            'slug' => 'backup-strategies',
            'type' => 'lesson',
            'content' => 'Design snapshot schedules, retention policies, and cross-region copy rules.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 1,
            'is_published' => true,
        ]);

        $cloudDisasterLesson2 = Lesson::create([
            'module_id' => $cloudDisaster->id,
            'title' => 'Multi-Region Failover',
            'slug' => 'multi-region-failover',
            'type' => 'lesson',
            'content' => 'Run active-passive or active-active topologies and test recovery procedures.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 2,
            'is_published' => true,
        ]);

        $securityCryptoLesson1 = Lesson::create([
            'module_id' => $securityCrypto->id,
            'title' => 'Symmetric & Asymmetric Encryption',
            'slug' => 'symmetric-asymmetric-encryption',
            'type' => 'lesson',
            'content' => 'Compare AES and RSA use cases, key lengths, and performance trade-offs.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $securityCryptoLesson2 = Lesson::create([
            'module_id' => $securityCrypto->id,
            'title' => 'Digital Signatures & PKI',
            'slug' => 'digital-signatures-pki',
            'type' => 'lesson',
            'content' => 'Establish trust with certificates, certificate authorities, and signature verification.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $securityNetworkLesson1 = Lesson::create([
            'module_id' => $securityNetwork->id,
            'title' => 'Firewalls & IDS/IPS',
            'slug' => 'firewalls-ids-ips',
            'type' => 'lesson',
            'content' => 'Filter traffic, detect anomalies, and respond to intrusion attempts in real time.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 1,
            'is_published' => true,
        ]);

        $securityNetworkLesson2 = Lesson::create([
            'module_id' => $securityNetwork->id,
            'title' => 'VPN & Zero Trust Networks',
            'slug' => 'vpn-zero-trust-networks',
            'type' => 'lesson',
            'content' => 'Secure remote access and internal East-West traffic with zero trust principles.',
            'video_url' => null,
            'estimated_time_minutes' => 29,
            'position' => 2,
            'is_published' => true,
        ]);

        $securityAppSecLesson1 = Lesson::create([
            'module_id' => $securityAppSec->id,
            'title' => 'OWASP Top 10',
            'slug' => 'owasp-top-10',
            'type' => 'lesson',
            'content' => 'Map common web vulnerabilities to code changes, headers, and validation rules.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $securityAppSecLesson2 = Lesson::create([
            'module_id' => $securityAppSec->id,
            'title' => 'Secure Coding Practices',
            'slug' => 'secure-coding-practices',
            'type' => 'lesson',
            'content' => 'Adopt threat-informed development with input validation, output encoding, and least privilege.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $securityComplianceLesson1 = Lesson::create([
            'module_id' => $securityCompliance->id,
            'title' => 'GDPR & Data Privacy',
            'slug' => 'gdpr-data-privacy',
            'type' => 'lesson',
            'content' => 'Implement consent flows, data minimization, and user rights handling for courses.',
            'video_url' => null,
            'estimated_time_minutes' => 27,
            'position' => 1,
            'is_published' => true,
        ]);

        $securityComplianceLesson2 = Lesson::create([
            'module_id' => $securityCompliance->id,
            'title' => 'Security Audit Methodologies',
            'slug' => 'security-audit-methodologies',
            'type' => 'lesson',
            'content' => 'Run structured audits, log findings, and track remediation to completion.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 2,
            'is_published' => true,
        ]);

        $blockchainSolidityLesson1 = Lesson::create([
            'module_id' => $blockchainSolidity->id,
            'title' => 'Advanced Solidity Patterns',
            'slug' => 'advanced-solidity-patterns',
            'type' => 'lesson',
            'content' => 'Use factory, proxy, and access-control patterns for upgradable and secure contracts.',
            'video_url' => null,
            'estimated_time_minutes' => 38,
            'position' => 1,
            'is_published' => true,
        ]);

        $blockchainSolidityLesson2 = Lesson::create([
            'module_id' => $blockchainSolidity->id,
            'title' => 'Gas Optimization Techniques',
            'slug' => 'gas-optimization-techniques',
            'type' => 'lesson',
            'content' => 'Reduce transaction costs with packing, events, and efficient storage usage.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $blockchainWeb3Lesson1 = Lesson::create([
            'module_id' => $blockchainWeb3->id,
            'title' => 'Web3.js & Ethers.js',
            'slug' => 'web3js-ethersjs',
            'type' => 'lesson',
            'content' => 'Connect frontend applications to Ethereum networks with provider and signer abstractions.',
            'video_url' => null,
            'estimated_time_minutes' => 33,
            'position' => 1,
            'is_published' => true,
        ]);

        $blockchainWeb3Lesson2 = Lesson::create([
            'module_id' => $blockchainWeb3->id,
            'title' => 'Connecting Frontend to Smart Contracts',
            'slug' => 'connecting-frontend-smart-contracts',
            'type' => 'lesson',
            'content' => 'Read and write contract state, handle events, and manage wallet connections.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => true,
        ]);

        $blockchainSecurityLesson1 = Lesson::create([
            'module_id' => $blockchainSecurity->id,
            'title' => 'Common Vulnerabilities & Exploits',
            'slug' => 'common-vulnerabilities-exploits',
            'type' => 'lesson',
            'content' => 'Study reentrancy, overflow, and front-running attack vectors with real examples.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => true,
        ]);

        $blockchainSecurityLesson2 = Lesson::create([
            'module_id' => $blockchainSecurity->id,
            'title' => 'Auditing Smart Contracts',
            'slug' => 'auditing-smart-contracts',
            'type' => 'lesson',
            'content' => 'Run manual and tool-assisted reviews, document findings, and recommend fixes.',
            'video_url' => null,
            'estimated_time_minutes' => 32,
            'position' => 2,
            'is_published' => true,
        ]);

        $blockchainDeFiLesson1 = Lesson::create([
            'module_id' => $blockchainDeFi->id,
            'title' => 'DeFi Protocols Overview',
            'slug' => 'defi-protocols-overview',
            'type' => 'lesson',
            'content' => 'Explore lending, AMMs, and staking protocols that power decentralized finance.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => true,
        ]);

        $blockchainDeFiLesson2 = Lesson::create([
            'module_id' => $blockchainDeFi->id,
            'title' => 'Token Standards (ERC-20, ERC-721)',
            'slug' => 'token-standards-erc20-erc721',
            'type' => 'lesson',
            'content' => 'Implement fungible and NFT token contracts with safe transfer and approval flows.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 2,
            'is_published' => true,
        ]);

        $draftAdvancedTestingLesson1 = Lesson::create([
            'module_id' => $draftAdvancedTesting->id,
            'title' => 'Feature Testing Deep Dive',
            'slug' => 'feature-testing-deep-dive',
            'type' => 'lesson',
            'content' => 'Write end-to-end feature tests that cover happy paths and edge cases.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 1,
            'is_published' => false,
        ]);

        $draftAdvancedTestingLesson2 = Lesson::create([
            'module_id' => $draftAdvancedTesting->id,
            'title' => 'Integration Testing Strategies',
            'slug' => 'integration-testing-strategies',
            'type' => 'lesson',
            'content' => 'Test database, API, and queue interactions with controlled test environments.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 2,
            'is_published' => false,
        ]);

        $draftFixturesLesson1 = Lesson::create([
            'module_id' => $draftFixtures->id,
            'title' => 'Database Fixtures & Factories',
            'slug' => 'database-fixtures-factories',
            'type' => 'lesson',
            'content' => 'Generate realistic test data with model factories and dataset seeding.',
            'video_url' => null,
            'estimated_time_minutes' => 28,
            'position' => 1,
            'is_published' => false,
        ]);

        $draftFixturesLesson2 = Lesson::create([
            'module_id' => $draftFixtures->id,
            'title' => 'Mocking & Stubbing',
            'slug' => 'mocking-stubbing',
            'type' => 'lesson',
            'content' => 'Isolate units under test by replacing external services with predictable doubles.',
            'video_url' => null,
            'estimated_time_minutes' => 26,
            'position' => 2,
            'is_published' => false,
        ]);

        $draftCoverageLesson1 = Lesson::create([
            'module_id' => $draftCoverage->id,
            'title' => 'Code Coverage Tools',
            'slug' => 'code-coverage-tools',
            'type' => 'lesson',
            'content' => 'Configure PHPUnit and Xdebug to measure lines, methods, and risk coverage.',
            'video_url' => null,
            'estimated_time_minutes' => 24,
            'position' => 1,
            'is_published' => false,
        ]);

        $draftCoverageLesson2 = Lesson::create([
            'module_id' => $draftCoverage->id,
            'title' => 'Interpreting Coverage Reports',
            'slug' => 'interpreting-coverage-reports',
            'type' => 'lesson',
            'content' => 'Read HTML and XML reports to find untested paths and prioritize test writing.',
            'video_url' => null,
            'estimated_time_minutes' => 22,
            'position' => 2,
            'is_published' => false,
        ]);

        $draftComplexFlowsLesson1 = Lesson::create([
            'module_id' => $draftComplexFlows->id,
            'title' => 'Testing Multi-Step Workflows',
            'slug' => 'testing-multi-step-workflows',
            'type' => 'lesson',
            'content' => 'Coordinate database, session, and queue state across lengthy test scenarios.',
            'video_url' => null,
            'estimated_time_minutes' => 30,
            'position' => 1,
            'is_published' => false,
        ]);

        $draftComplexFlowsLesson2 = Lesson::create([
            'module_id' => $draftComplexFlows->id,
            'title' => 'End-to-End Testing with Dusk',
            'slug' => 'end-to-end-testing-dusk',
            'type' => 'lesson',
            'content' => 'Automate browser tests that verify role-based dashboards and enrollment flows.',
            'video_url' => null,
            'estimated_time_minutes' => 35,
            'position' => 2,
            'is_published' => false,
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

        // Quiz for Design Course
        $designQuiz = Quiz::create([
            'course_id' => $designCourse->id,
            'module_id' => $designProcess->id,
            'title' => 'UX Design Fundamentals Quiz',
            'description' => 'Test your knowledge of user experience design principles',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $designQuizQuestion1 = $designQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary goal of user research in UX design?',
            'options' => [
                ['key' => 'understand_users', 'text' => 'Understand user needs, behaviors, and motivations'],
                ['key' => 'create_art', 'text' => 'Create visually appealing designs'],
                ['key' => 'write_code', 'text' => 'Write efficient code'],
                ['key' => 'manage_projects', 'text' => 'Manage project timelines and budgets'],
            ],
            'correct_answers' => ['understand_users'],
            'points' => 2,
            'position' => 1,
        ]);

        $designQuizQuestion2 = $designQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are key principles of accessible design? (Select all that apply)',
            'options' => [
                ['key' => 'color_contrast', 'text' => 'Sufficient color contrast'],
                ['key' => 'keyboard_nav', 'text' => 'Keyboard navigability'],
                ['key' => 'fancy_animations', 'text' => 'Fancy animations and transitions'],
                ['key' => 'alt_text', 'text' => 'Alternative text for images'],
            ],
            'correct_answers' => ['color_contrast', 'keyboard_nav', 'alt_text'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for Data Science Course
        $dataScienceQuiz = Quiz::create([
            'course_id' => $dataScienceCourse->id,
            'module_id' => $dataVisualization->id,
            'title' => 'Data Science Fundamentals Quiz',
            'description' => 'Test your knowledge of data analysis and visualization',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $dataScienceQuizQuestion1 = $dataScienceQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary purpose of data cleaning in the data analysis process?',
            'options' => [
                ['key' => 'remove_errors', 'text' => 'Remove or correct inaccurate records'],
                ['key' => 'increase_size', 'text' => 'Increase the dataset size'],
                ['key' => 'add_features', 'text' => 'Add new features to the dataset'],
                ['key' => 'change_format', 'text' => 'Change the file format of the dataset'],
            ],
            'correct_answers' => ['remove_errors'],
            'points' => 2,
            'position' => 1,
        ]);

        $dataScienceQuizQuestion2 = $dataScienceQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which Python libraries are commonly used for data visualization? (Select all that apply)',
            'options' => [
                ['key' => 'matplotlib', 'text' => 'Matplotlib'],
                ['key' => 'pandas', 'text' => 'Pandas (primarily for data manipulation)'],
                ['key' => 'seaborn', 'text' => 'Seaborn'],
                ['key' => 'numpy', 'text' => 'NumPy (primarily for numerical operations)'],
            ],
            'correct_answers' => ['matplotlib', 'seaborn'],
            'points' => 2,
            'position' => 2,
        ]);

        // Quiz for Mobile Course
        $mobileQuiz = Quiz::create([
            'course_id' => $mobileCourse->id,
            'module_id' => $mobileComponents->id,
            'title' => 'Mobile Development Quiz',
            'description' => 'Test your knowledge of React Native mobile development',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $mobileQuizQuestion1 = $mobileQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary advantage of using React Native for mobile development?',
            'options' => [
                ['key' => 'cross_platform', 'text' => 'Write once, run on both iOS and Android'],
                ['key' => 'better_performance', 'text' => 'Better performance than native apps'],
                ['key' => 'easier_testing', 'text' => 'Easier to test than native apps'],
                ['key' => 'cheaper_tools', 'text' => 'Development tools are free and open source'],
            ],
            'correct_answers' => ['cross_platform'],
            'points' => 2,
            'position' => 1,
        ]);

        $mobileQuizQuestion2 = $mobileQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are key concepts in React Native? (Select all that apply)',
            'options' => [
                ['key' => 'components', 'text' => 'Components and props'],
                ['key' => 'state', 'text' => 'State management'],
                ['key' => 'html', 'text' => 'Direct HTML rendering'],
                ['key' => 'flexbox', 'text' => 'Flexbox layout system'],
            ],
            'correct_answers' => ['components', 'state', 'flexbox'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for Cloud Course
        $cloudQuiz = Quiz::create([
            'course_id' => $cloudCourse->id,
            'module_id' => $cloudServices->id,
            'title' => 'Cloud Computing Quiz',
            'description' => 'Test your knowledge of AWS cloud services',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $cloudQuizQuestion1 = $cloudQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What does EC2 stand for in AWS?',
            'options' => [
                ['key' => 'elastic_compute_cloud', 'text' => 'Elastic Compute Cloud'],
                ['key' => 'elastic_container_service', 'text' => 'Elastic Container Service'],
                ['key' => 'elastic_block_store', 'text' => 'Elastic Block Store'],
                ['key' => 'elastic_load_balancing', 'text' => 'Elastic Load Balancing'],
            ],
            'correct_answers' => ['elastic_compute_cloud'],
            'points' => 2,
            'position' => 1,
        ]);

        $cloudQuizQuestion2 = $cloudQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which AWS services are used for storage? (Select all that apply)',
            'options' => [
                ['key' => 's3', 'text' => 'Amazon S3 (Simple Storage Service)'],
                ['key' => 'ebs', 'text' => 'Amazon EBS (Elastic Block Store)'],
                ['key' => 'rds', 'text' => 'Amazon RDS (Relational Database Service)'],
                ['key' => 'lambda', 'text' => 'AWS Lambda (compute service)'],
            ],
            'correct_answers' => ['s3', 'ebs'],
            'points' => 2,
            'position' => 2,
        ]);

        // Quiz for Cybersecurity Course
        $cybersecurityQuiz = Quiz::create([
            'course_id' => $cybersecurityCourse->id,
            'module_id' => $threatModeling->id,
            'title' => 'Cybersecurity Fundamentals Quiz',
            'description' => 'Test your knowledge of cybersecurity principles and practices',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $cybersecurityQuizQuestion1 = $cybersecurityQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary goal of cybersecurity?',
            'options' => [
                ['key' => 'protect_data', 'text' => 'Protect data and systems from unauthorized access'],
                ['key' => 'increase_speed', 'text' => 'Increase system processing speed'],
                ['key' => 'reduce_costs', 'text' => 'Reduce hardware and software costs'],
                ['key' => 'improve_ui', 'text' => 'Improve user interface design'],
            ],
            'correct_answers' => ['protect_data'],
            'points' => 2,
            'position' => 1,
        ]);

        $cybersecurityQuizQuestion2 = $cybersecurityQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are common cybersecurity threats? (Select all that apply)',
            'options' => [
                ['key' => 'phishing', 'text' => 'Phishing attacks'],
                ['key' => 'ddos', 'text' => 'Distributed Denial of Service (DDoS) attacks'],
                ['key' => 'sql_injection', 'text' => 'SQL injection attacks'],
                ['key' => 'power_outage', 'text' => 'Power outage'],
            ],
            'correct_answers' => ['phishing', 'ddos', 'sql_injection'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for Blockchain Course
        $blockchainQuiz = Quiz::create([
            'course_id' => $blockchainCourse->id,
            'module_id' => $smartContracts->id,
            'title' => 'Blockchain Development Quiz',
            'description' => 'Test your knowledge of blockchain and smart contract development',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $blockchainQuizQuestion1 = $blockchainQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What programming language is primarily used for writing smart contracts on Ethereum?',
            'options' => [
                ['key' => 'solidity', 'text' => 'Solidity'],
                ['key' => 'javascript', 'text' => 'JavaScript'],
                ['key' => 'python', 'text' => 'Python'],
                ['key' => 'go', 'text' => 'Go (Golang)'],
            ],
            'correct_answers' => ['solidity'],
            'points' => 2,
            'position' => 1,
        ]);

        $blockchainQuizQuestion2 = $blockchainQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are key components of a blockchain network? (Select all that apply)',
            'options' => [
                ['key' => 'distributed_ledger', 'text' => 'Distributed ledger'],
                ['key' => 'centralized_server', 'text' => 'Centralized server'],
                ['key' => 'consensus_mechanism', 'text' => 'Consensus mechanism'],
                ['key' => 'cryptographic_hashing', 'text' => 'Cryptographic hashing'],
            ],
            'correct_answers' => ['distributed_ledger', 'consensus_mechanism', 'cryptographic_hashing'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for ML Course
        $mlQuiz = Quiz::create([
            'course_id' => $mlCourse->id,
            'module_id' => $mlWorkflow->id,
            'title' => 'Machine Learning Fundamentals Quiz',
            'description' => 'Test your knowledge of machine learning concepts',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $mlQuizQuestion1 = $mlQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary goal of machine learning?',
            'options' => [
                ['key' => 'learn_from_data', 'text' => 'Learn patterns from data to make predictions'],
                ['key' => 'store_data', 'text' => 'Store large amounts of data efficiently'],
                ['key' => 'visualize_data', 'text' => 'Create visual representations of data'],
                ['key' => 'encrypt_data', 'text' => 'Encrypt data for security'],
            ],
            'correct_answers' => ['learn_from_data'],
            'points' => 2,
            'position' => 1,
        ]);

        $mlQuizQuestion2 = $mlQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are types of machine learning? (Select all that apply)',
            'options' => [
                ['key' => 'supervised', 'text' => 'Supervised learning'],
                ['key' => 'unsupervised', 'text' => 'Unsupervised learning'],
                ['key' => 'reinforcement', 'text' => 'Reinforcement learning'],
                ['key' => 'deterministic', 'text' => 'Deterministic learning'],
            ],
            'correct_answers' => ['supervised', 'unsupervised', 'reinforcement'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for DevOps Course
        $devopsQuiz = Quiz::create([
            'course_id' => $devopsCourse->id,
            'module_id' => $devopsPipelines->id,
            'title' => 'DevOps Fundamentals Quiz',
            'description' => 'Test your knowledge of DevOps principles and practices',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $devopsQuizQuestion1 = $devopsQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary goal of DevOps?',
            'options' => [
                ['key' => 'collaboration', 'text' => 'Improve collaboration between development and operations teams'],
                ['key' => 'isolation', 'text' => 'Isolate development and operations teams'],
                ['key' => 'manual_processes', 'text' => 'Increase manual processes for better control'],
                ['key' => 'slow_delivery', 'text' => 'Slow down software delivery for quality'],
            ],
            'correct_answers' => ['collaboration'],
            'points' => 2,
            'position' => 1,
        ]);

        $devopsQuizQuestion2 = $devopsQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are key DevOps practices? (Select all that apply)',
            'options' => [
                ['key' => 'continuous_integration', 'text' => 'Continuous Integration (CI)'],
                ['key' => 'continuous_delivery', 'text' => 'Continuous Delivery (CD)'],
                ['key' => 'manual_testing', 'text' => 'Manual testing only'],
                ['key' => 'infrastructure_as_code', 'text' => 'Infrastructure as Code (IaC)'],
            ],
            'correct_answers' => ['continuous_integration', 'continuous_delivery', 'infrastructure_as_code'],
            'points' => 3,
            'position' => 2,
        ]);

        // Quiz for React Course
        $reactQuiz = Quiz::create([
            'course_id' => $reactCourse->id,
            'module_id' => $reactUi->id,
            'title' => 'React Fundamentals Quiz',
            'description' => 'Test your knowledge of React concepts',
            'pass_score' => 70,
            'estimated_time_minutes' => 20,
            'is_published' => true,
            'position' => 3,
        ]);

        $reactQuestion1 = $reactQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the primary purpose of React hooks?',
            'options' => [
                ['key' => 'hooks', 'text' => 'Use state and other React features in functional components'],
                ['key' => 'styling', 'text' => 'Add styling to React components'],
                ['key' => 'routing', 'text' => 'Handle client-side routing'],
                ['key' => 'internationalization', 'text' => 'Add internationalization support'],
            ],
            'correct_answers' => ['hooks'],
            'points' => 2,
            'position' => 1,
        ]);

        $reactQuestion2 = $reactQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which of the following are core React concepts? (Select all that apply)',
            'options' => [
                ['key' => 'virtual_dom', 'text' => 'Virtual DOM'],
                ['key' => 'jsx', 'text' => 'JSX syntax'],
                ['key' => 'css', 'text' => 'CSS styling'],
                ['key' => 'sql', 'text' => 'SQL database queries'],
            ],
            'correct_answers' => ['virtual_dom', 'jsx'],
            'points' => 2,
            'position' => 2,
        ]);

        $reactComponentsQuiz = Quiz::create([
            'course_id' => $reactCourse->id,
            'module_id' => $reactComponents->id,
            'title' => 'Component Patterns Quiz',
            'description' => 'Check your understanding of reusable and compound component patterns.',
            'pass_score' => 70,
            'estimated_time_minutes' => 15,
            'is_published' => true,
            'position' => 3,
        ]);

        $reactComponentsQuizQuestion1 = $reactComponentsQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is the main benefit of compound components?',
            'options' => [
                ['key' => 'shared_state', 'text' => 'Shared implicit state between parent and children'],
                ['key' => 'automatic_styling', 'text' => 'Automatic styling without CSS'],
                ['key' => 'database_queries', 'text' => 'Direct database queries from the browser'],
                ['key' => 'server_rendering', 'text' => 'Forced server-side rendering'],
            ],
            'correct_answers' => ['shared_state'],
            'points' => 1,
            'position' => 1,
        ]);

        $reactComponentsQuizQuestion2 = $reactComponentsQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which are valid React component patterns?',
            'options' => [
                ['key' => 'render_props', 'text' => 'Render props'],
                ['key' => 'higher_order_components', 'text' => 'Higher-order components'],
                ['key' => 'sql_joins', 'text' => 'SQL joins in JSX'],
                ['key' => 'custom_hooks', 'text' => 'Custom hooks'],
            ],
            'correct_answers' => ['render_props', 'higher_order_components'],
            'points' => 2,
            'position' => 2,
        ]);

        $mlDeploymentQuiz = Quiz::create([
            'course_id' => $mlCourse->id,
            'module_id' => $mlDeployment->id,
            'title' => 'Model Training & Evaluation Quiz',
            'description' => 'Assess your knowledge of model validation and evaluation metrics.',
            'pass_score' => 70,
            'estimated_time_minutes' => 15,
            'is_published' => true,
            'position' => 3,
        ]);

        $mlDeploymentQuizQuestion1 = $mlDeploymentQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Which technique helps prevent overfitting?',
            'options' => [
                ['key' => 'cross_validation', 'text' => 'Cross-validation'],
                ['key' => 'data_leakage', 'text' => 'Data leakage'],
                ['key' => 'feature_escalation', 'text' => 'Feature escalation'],
                ['key' => 'random_guessing', 'text' => 'Random guessing'],
            ],
            'correct_answers' => ['cross_validation'],
            'points' => 1,
            'position' => 1,
        ]);

        $mlDeploymentQuizQuestion2 = $mlDeploymentQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which are common model evaluation metrics?',
            'options' => [
                ['key' => 'accuracy', 'text' => 'Accuracy'],
                ['key' => 'precision', 'text' => 'Precision'],
                ['key' => 'recall', 'text' => 'Recall'],
                ['key' => 'latency', 'text' => 'Latency'],
            ],
            'correct_answers' => ['accuracy', 'precision', 'recall'],
            'points' => 2,
            'position' => 2,
        ]);

        $devopsMonitoringQuiz = Quiz::create([
            'course_id' => $devopsCourse->id,
            'module_id' => $devopsMonitoring->id,
            'title' => 'Monitoring & Observability Quiz',
            'description' => 'Test your understanding of metrics, logs, traces, and alerting.',
            'pass_score' => 70,
            'estimated_time_minutes' => 15,
            'is_published' => true,
            'position' => 3,
        ]);

        $devopsMonitoringQuizQuestion1 = $devopsMonitoringQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Which tool is commonly used for metrics collection?',
            'options' => [
                ['key' => 'prometheus', 'text' => 'Prometheus'],
                ['key' => 'kubernetes', 'text' => 'Kubernetes'],
                ['key' => 'docker', 'text' => 'Docker'],
                ['key' => 'terraform', 'text' => 'Terraform'],
            ],
            'correct_answers' => ['prometheus'],
            'points' => 1,
            'position' => 1,
        ]);

        $devopsMonitoringQuizQuestion2 = $devopsMonitoringQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which are pillars of observability?',
            'options' => [
                ['key' => 'metrics', 'text' => 'Metrics'],
                ['key' => 'logs', 'text' => 'Logs'],
                ['key' => 'traces', 'text' => 'Traces'],
                ['key' => 'backups', 'text' => 'Backups'],
            ],
            'correct_answers' => ['metrics', 'logs', 'traces'],
            'points' => 2,
            'position' => 2,
        ]);

        $designResearchQuiz = Quiz::create([
            'course_id' => $designCourse->id,
            'module_id' => $designResearch->id,
            'title' => 'User Research Quiz',
            'description' => 'Evaluate your grasp of user research methods and outputs.',
            'pass_score' => 70,
            'estimated_time_minutes' => 15,
            'is_published' => true,
            'position' => 3,
        ]);

        $designResearchQuizQuestion1 = $designResearchQuiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'What is a user persona?',
            'options' => [
                ['key' => 'fictional_character', 'text' => 'A fictional character representing a user segment'],
                ['key' => 'database_user', 'text' => 'A database user account'],
                ['key' => 'admin_role', 'text' => 'An admin role in the LMS'],
                ['key' => 'guest_visitor', 'text' => 'A guest visitor session'],
            ],
            'correct_answers' => ['fictional_character'],
            'points' => 1,
            'position' => 1,
        ]);

        $designResearchQuizQuestion2 = $designResearchQuiz->questions()->create([
            'type' => 'multiple_choice',
            'prompt' => 'Which are user research methods?',
            'options' => [
                ['key' => 'interviews', 'text' => 'Interviews'],
                ['key' => 'surveys', 'text' => 'Surveys'],
                ['key' => 'a_b_testing', 'text' => 'A/B testing'],
                ['key' => 'code_reviews', 'text' => 'Code reviews'],
            ],
            'correct_answers' => ['interviews', 'surveys', 'a_b_testing'],
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

        // Additional enrollments for original students in new courses
        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $designCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(20),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $dataScienceCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(18),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $mobileCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(15),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $cloudCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(12),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $cybersecurityCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(10),
        ]);

        Enrollment::create([
            'user_id' => $student->id,
            'course_id' => $blockchainCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(8),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $designCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(18),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $dataScienceCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(16),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $mobileCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(14),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $cloudCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(10),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $cybersecurityCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(8),
        ]);

        Enrollment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $blockchainCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(6),
        ]);

        // Enrollments for new students
        Enrollment::create([
            'user_id' => $student3->id,
            'course_id' => $laravelCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(30),
        ]);

        Enrollment::create([
            'user_id' => $student3->id,
            'course_id' => $designCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(28),
        ]);

        Enrollment::create([
            'user_id' => $student4->id,
            'course_id' => $reactCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(25),
        ]);

        Enrollment::create([
            'user_id' => $student4->id,
            'course_id' => $dataScienceCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(22),
        ]);

        Enrollment::create([
            'user_id' => $student5->id,
            'course_id' => $mlCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(20),
        ]);

        Enrollment::create([
            'user_id' => $student5->id,
            'course_id' => $mobileCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(18),
        ]);

        Enrollment::create([
            'user_id' => $student6->id,
            'course_id' => $devopsCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(15),
        ]);

        Enrollment::create([
            'user_id' => $student6->id,
            'course_id' => $cloudCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(12),
        ]);

        Enrollment::create([
            'user_id' => $student7->id,
            'course_id' => $designCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(10),
        ]);

        Enrollment::create([
            'user_id' => $student7->id,
            'course_id' => $cybersecurityCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(8),
        ]);

        Enrollment::create([
            'user_id' => $student8->id,
            'course_id' => $blockchainCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(5),
        ]);

        Enrollment::create([
            'user_id' => $student9->id,
            'course_id' => $dataScienceCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(3),
        ]);

        Enrollment::create([
            'user_id' => $student10->id,
            'course_id' => $mobileCourse->id,
            'status' => 'active',
            'enrolled_at' => now()->subDays(1),
        ]);

        // Some completed enrollments (older)
        Enrollment::create([
            'user_id' => $student3->id,
            'course_id' => $reactCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonths(3),
        ]);

        Enrollment::create([
            'user_id' => $student4->id,
            'course_id' => $mlCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonths(2),
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

        // Progress records for new lessons
        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $designBasicsLesson->id,
            'progress_percent' => 80,
            'completed_at' => now()->subDays(18),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $designProcessLesson->id,
            'progress_percent' => 60,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $dataManipulationLesson->id,
            'progress_percent' => 90,
            'completed_at' => now()->subDays(15),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $dataVisualizationLesson->id,
            'progress_percent' => 70,
            'completed_at' => now()->subDays(10),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $mobileSetupLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(12),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $mobileComponentsLesson->id,
            'progress_percent' => 40,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $cloudFundamentalsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(8),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $cloudServicesLesson->id,
            'progress_percent' => 50,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $securityBasicsLesson->id,
            'progress_percent' => 85,
            'completed_at' => now()->subDays(6),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $threatModelingLesson->id,
            'progress_percent' => 30,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $blockchainIntroLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(4),
        ]);

        Progress::create([
            'user_id' => $student->id,
            'lesson_id' => $smartContractsLesson->id,
            'progress_percent' => 20,
            'completed_at' => null,
        ]);

        // Progress records for second student in new courses
        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $designBasicsLesson->id,
            'progress_percent' => 75,
            'completed_at' => now()->subDays(16),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $dataManipulationLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(12),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $mobileSetupLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(10),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $cloudFundamentalsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(6),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $securityBasicsLesson->id,
            'progress_percent' => 90,
            'completed_at' => now()->subDays(4),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $blockchainIntroLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(2),
        ]);

        // Progress records for new students
        Progress::create([
            'user_id' => $student3->id,
            'lesson_id' => $welcomeLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(25),
        ]);

        Progress::create([
            'user_id' => $student3->id,
            'lesson_id' => $authLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(25),
        ]);

        Progress::create([
            'user_id' => $student3->id,
            'lesson_id' => $designBasicsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(20),
        ]);

        Progress::create([
            'user_id' => $student4->id,
            'lesson_id' => $welcomeLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(20),
        ]);

        Progress::create([
            'user_id' => $student4->id,
            'lesson_id' => $authLesson->id,
            'progress_percent' => 80,
            'completed_at' => now()->subDays(20),
        ]);

        Progress::create([
            'user_id' => $student4->id,
            'lesson_id' => $paymentsLesson->id,
            'progress_percent' => 60,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student5->id,
            'lesson_id' => $welcomeLesson->id,
            'progress_percent' => 70,
            'completed_at' => now()->subDays(15),
        ]);

        Progress::create([
            'user_id' => $student5->id,
            'lesson_id' => $dataManipulationLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(10),
        ]);

        Progress::create([
            'user_id' => $student6->id,
            'lesson_id' => $devopsLesson->id,
            'progress_percent' => 80,
            'completed_at' => now()->subDays(10),
        ]);

        Progress::create([
            'user_id' => $student6->id,
            'lesson_id' => $cloudFundamentalsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(5),
        ]);

        Progress::create([
            'user_id' => $student7->id,
            'lesson_id' => $designBasicsLesson->id,
            'progress_percent' => 90,
            'completed_at' => now()->subDays(5),
        ]);

        Progress::create([
            'user_id' => $student7->id,
            'lesson_id' => $securityBasicsLesson->id,
            'progress_percent' => 70,
            'completed_at' => now()->subDays(5),
        ]);

        Progress::create([
            'user_id' => $student8->id,
            'lesson_id' => $blockchainIntroLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(3),
        ]);

        Progress::create([
            'user_id' => $student8->id,
            'lesson_id' => $smartContractsLesson->id,
            'progress_percent' => 60,
            'completed_at' => null,
        ]);

        Progress::create([
            'user_id' => $student9->id,
            'lesson_id' => $dataManipulationLesson->id,
            'progress_percent' => 80,
            'completed_at' => now()->subDays(2),
        ]);

        Progress::create([
            'user_id' => $student10->id,
            'lesson_id' => $mobileSetupLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDays(1),
        ]);

        // Some completed progress records (older)
        Progress::create([
            'user_id' => $student3->id,
            'lesson_id' => $reactLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subMonths(2),
        ]);

        Progress::create([
            'user_id' => $student4->id,
            'lesson_id' => $mlLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subMonths(1),
        ]);

        Progress::create([
            'user_id' => $secondStudent->id,
            'lesson_id' => $devopsLesson->id,
            'progress_percent' => 100,
            'completed_at' => now()->subDay(),
        ]);

        // Payment records for new course enrollments
        Payment::create([
            'user_id' => $student->id,
            'course_id' => $designCourse->id,
            'provider' => 'stripe',
            'amount' => 49.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_design_student',
            'paid_at' => now()->subDays(20),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $dataScienceCourse->id,
            'provider' => 'stripe',
            'amount' => 75.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_datascience_student',
            'paid_at' => now()->subDays(18),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $mobileCourse->id,
            'provider' => 'stripe',
            'amount' => 85.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_mobile_student',
            'paid_at' => now()->subDays(15),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $cloudCourse->id,
            'provider' => 'stripe',
            'amount' => 95.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cloud_student',
            'paid_at' => now()->subDays(12),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $cybersecurityCourse->id,
            'provider' => 'stripe',
            'amount' => 110.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cybersecurity_student',
            'paid_at' => now()->subDays(10),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $blockchainCourse->id,
            'provider' => 'stripe',
            'amount' => 120.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_blockchain_student',
            'paid_at' => now()->subDays(8),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $designCourse->id,
            'provider' => 'stripe',
            'amount' => 49.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_design_student_two',
            'paid_at' => now()->subDays(18),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $dataScienceCourse->id,
            'provider' => 'stripe',
            'amount' => 75.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_datascience_student_two',
            'paid_at' => now()->subDays(16),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $mobileCourse->id,
            'provider' => 'stripe',
            'amount' => 85.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_mobile_student_two',
            'paid_at' => now()->subDays(14),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $cloudCourse->id,
            'provider' => 'stripe',
            'amount' => 95.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cloud_student_two',
            'paid_at' => now()->subDays(10),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $cybersecurityCourse->id,
            'provider' => 'stripe',
            'amount' => 110.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cybersecurity_student_two',
            'paid_at' => now()->subDays(8),
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $blockchainCourse->id,
            'provider' => 'stripe',
            'amount' => 120.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_blockchain_student_two',
            'paid_at' => now()->subDays(6),
        ]);

        // Payment records for new students
        Payment::create([
            'user_id' => $student3->id,
            'course_id' => $laravelCourse->id,
            'provider' => 'stripe',
            'amount' => 79.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_laravel_student3',
            'paid_at' => now()->subDays(30),
        ]);

        Payment::create([
            'user_id' => $student3->id,
            'course_id' => $designCourse->id,
            'provider' => 'stripe',
            'amount' => 49.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_design_student3',
            'paid_at' => now()->subDays(28),
        ]);

        Payment::create([
            'user_id' => $student4->id,
            'course_id' => $reactCourse->id,
            'provider' => 'stripe',
            'amount' => 59.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_react_student4',
            'paid_at' => now()->subDays(25),
        ]);

        Payment::create([
            'user_id' => $student4->id,
            'course_id' => $dataScienceCourse->id,
            'provider' => 'stripe',
            'amount' => 75.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_datascience_student4',
            'paid_at' => now()->subDays(22),
        ]);

        Payment::create([
            'user_id' => $student5->id,
            'course_id' => $mlCourse->id,
            'provider' => 'stripe',
            'amount' => 89.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_ml_student5',
            'paid_at' => now()->subDays(20),
        ]);

        Payment::create([
            'user_id' => $student5->id,
            'course_id' => $mobileCourse->id,
            'provider' => 'stripe',
            'amount' => 85.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_mobile_student5',
            'paid_at' => now()->subDays(18),
        ]);

        Payment::create([
            'user_id' => $student6->id,
            'course_id' => $devopsCourse->id,
            'provider' => 'stripe',
            'amount' => 69.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_devops_student6',
            'paid_at' => now()->subDays(15),
        ]);

        Payment::create([
            'user_id' => $student6->id,
            'course_id' => $cloudCourse->id,
            'provider' => 'stripe',
            'amount' => 95.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cloud_student6',
            'paid_at' => now()->subDays(12),
        ]);

        Payment::create([
            'user_id' => $student7->id,
            'course_id' => $designCourse->id,
            'provider' => 'stripe',
            'amount' => 49.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_design_student7',
            'paid_at' => now()->subDays(10),
        ]);

        Payment::create([
            'user_id' => $student7->id,
            'course_id' => $cybersecurityCourse->id,
            'provider' => 'stripe',
            'amount' => 110.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_cybersecurity_student7',
            'paid_at' => now()->subDays(8),
        ]);

        Payment::create([
            'user_id' => $student8->id,
            'course_id' => $blockchainCourse->id,
            'provider' => 'stripe',
            'amount' => 120.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_blockchain_student8',
            'paid_at' => now()->subDays(5),
        ]);

        Payment::create([
            'user_id' => $student9->id,
            'course_id' => $dataScienceCourse->id,
            'provider' => 'stripe',
            'amount' => 75.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_datascience_student9',
            'paid_at' => now()->subDays(3),
        ]);

        Payment::create([
            'user_id' => $student10->id,
            'course_id' => $mobileCourse->id,
            'provider' => 'stripe',
            'amount' => 85.00,
            'currency' => $stripeCurrency,
            'status' => 'paid',
            'transaction_id' => 'seed_txn_mobile_student10',
            'paid_at' => now()->subDays(1),
        ]);

        // Some pending payments
        Payment::create([
            'user_id' => $student->id,
            'course_id' => $designCourse->id,
            'provider' => 'stripe',
            'amount' => 49.00,
            'currency' => $stripeCurrency,
            'status' => 'pending',
            'transaction_id' => 'seed_txn_design_student_pending',
            'paid_at' => null,
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $dataScienceCourse->id,
            'provider' => 'stripe',
            'amount' => 75.00,
            'currency' => $stripeCurrency,
            'status' => 'pending',
            'transaction_id' => 'seed_txn_datascience_student_pending',
            'paid_at' => null,
        ]);

        // Some failed payments
        Payment::create([
            'user_id' => $student->id,
            'course_id' => $mobileCourse->id,
            'provider' => 'stripe',
            'amount' => 85.00,
            'currency' => $stripeCurrency,
            'status' => 'failed',
            'transaction_id' => 'seed_txn_mobile_student_failed',
            'paid_at' => null,
        ]);

        Payment::create([
            'user_id' => $secondStudent->id,
            'course_id' => $cloudCourse->id,
            'provider' => 'stripe',
            'amount' => 95.00,
            'currency' => $stripeCurrency,
            'status' => 'failed',
            'transaction_id' => 'seed_txn_cloud_student_failed',
            'paid_at' => null,
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

        // Reviews for new courses
        Review::create([
            'course_id' => $designCourse->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Excellent course on UX design principles. Learned a lot about user research and prototyping.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $designCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 4,
            'comment' => 'Good introduction to UX design. Would like to see more advanced topics covered.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $dataScienceCourse->id,
            'user_id' => $student->id,
            'rating' => 4,
            'comment' => 'Great hands-on approach to data analysis with Python. The exercises were very helpful.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $dataScienceCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 5,
            'comment' => 'Comprehensive coverage of data manipulation and visualization techniques.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $mobileCourse->id,
            'user_id' => $student->id,
            'rating' => 3,
            'comment' => 'Good introduction to React Native, but some parts felt rushed.',
            'is_published' => false,
        ]);

        Review::create([
            'course_id' => $mobileCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 4,
            'comment' => 'Solid course for getting started with mobile development using React Native.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $cloudCourse->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Excellent AWS course. Learned how to architect scalable cloud applications.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $cloudCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 4,
            'comment' => 'Good overview of AWS services. Would like more deep dives into specific services.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $cybersecurityCourse->id,
            'user_id' => $student->id,
            'rating' => 4,
            'comment' => 'Great course on cybersecurity fundamentals. The threat modeling section was particularly useful.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $cybersecurityCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 5,
            'comment' => 'Comprehensive coverage of cybersecurity principles and practices.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $blockchainCourse->id,
            'user_id' => $student->id,
            'rating' => 3,
            'comment' => 'Good introduction to blockchain development, but some topics were too basic.',
            'is_published' => false,
        ]);

        Review::create([
            'course_id' => $blockchainCourse->id,
            'user_id' => $secondStudent->id,
            'rating' => 4,
            'comment' => 'Solid course for learning smart contract development with Solidity.',
            'is_published' => true,
        ]);

        // Reviews from new students

        Review::create([
            'course_id' => $dataScienceCourse->id,
            'user_id' => $student4->id,
            'rating' => 4,
            'comment' => 'Great practical exercises for learning data analysis.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $mobileCourse->id,
            'user_id' => $student5->id,
            'rating' => 3,
            'comment' => 'Decent introduction to React Native development.',
            'is_published' => false,
        ]);

        Review::create([
            'course_id' => $cloudCourse->id,
            'user_id' => $student6->id,
            'rating' => 5,
            'comment' => 'Excellent AWS course. Highly recommended!',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $cybersecurityCourse->id,
            'user_id' => $student7->id,
            'rating' => 4,
            'comment' => 'Good overview of cybersecurity fundamentals.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $blockchainCourse->id,
            'user_id' => $student8->id,
            'rating' => 3,
            'comment' => 'Introduction to blockchain was okay, but wanted more advanced topics.',
            'is_published' => false,
        ]);

        Review::create([
            'course_id' => $laravelCourse->id,
            'user_id' => $student9->id,
            'rating' => 5,
            'comment' => 'Excellent Laravel API course. Well-structured and informative.',
            'is_published' => true,
        ]);

        Review::create([
            'course_id' => $reactCourse->id,
            'user_id' => $student10->id,
            'rating' => 4,
            'comment' => 'Good course on React UI development. Learned a lot about component-based architecture.',
            'is_published' => true,
        ]);

        // Some older reviews
        Review::create([
            'course_id' => $designCourse->id,
            'user_id' => $student3->id,
            'rating' => 4,
            'comment' => 'Good course on UX design. Learned valuable skills for my career.',
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

        // Comments for new lessons
        Comment::create([
            'lesson_id' => $designBasicsLesson->id,
            'user_id' => $student->id,
            'body' => 'Great introduction to UX design principles. Looking forward to learning more.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $dataManipulationLesson->id,
            'user_id' => $student->id,
            'body' => 'The Pandas tutorial was extremely helpful for understanding data manipulation.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $mobileSetupLesson->id,
            'user_id' => $student->id,
            'body' => 'Setting up React Native was easier than I expected with the clear instructions.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $cloudFundamentalsLesson->id,
            'user_id' => $student->id,
            'body' => 'Good overview of cloud computing basics. The AWS free tier is handy for practicing.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $securityBasicsLesson->id,
            'user_id' => $student->id,
            'body' => 'Important foundation for anyone interested in cybersecurity.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $blockchainIntroLesson->id,
            'user_id' => $student->id,
            'body' => 'Fascinating introduction to blockchain technology and how it works.',
            'is_published' => true,
        ]);

        // Some additional comments from other students
        Comment::create([
            'lesson_id' => $designProcessLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Wireframing tools like Figma are really powerful for UX design.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $dataVisualizationLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Creating effective charts and graphs is both an art and a science.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $mobileComponentsLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Building reusable components is key to efficient mobile development.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $cloudServicesLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'AWS offers so many services it can be overwhelming at first.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $threatModelingLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Threat modeling helps identify potential security issues before they become problems.',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $smartContractsLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'Solidity takes some getting used to but is powerful for smart contract development.',
            'is_published' => true,
        ]);

        // Some unpublished comments for testing moderation
        Comment::create([
            'lesson_id' => $designBasicsLesson->id,
            'user_id' => $secondStudent->id,
            'body' => 'This comment is unpublished so admins can test comment moderation.',
            'is_published' => false,
        ]);

        Comment::create([
            'lesson_id' => $dataManipulationLesson->id,
            'user_id' => $student3->id,
            'body' => 'Another unpublished comment for testing the moderation queue.',
            'is_published' => false,
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

        // Issue certificates for students who have completed all lessons in a course
        $studentsToCheck = [
            [$student, $laravelCourse],
            [$secondStudent, $laravelCourse],
            [$student3, $laravelCourse],
            [$student, $reactCourse],
            [$student4, $reactCourse],
            [$student, $mlCourse],
            [$student4, $mlCourse],
            [$student5, $mlCourse],
            [$secondStudent, $devopsCourse],
            [$student6, $devopsCourse],
            [$student, $designCourse],
            [$secondStudent, $designCourse],
            [$student3, $designCourse],
            [$student, $dataScienceCourse],
            [$secondStudent, $dataScienceCourse],
            [$student4, $dataScienceCourse],
            [$student9, $dataScienceCourse],
            [$student, $mobileCourse],
            [$secondStudent, $mobileCourse],
            [$student5, $mobileCourse],
            [$student10, $mobileCourse],
            [$student, $cloudCourse],
            [$secondStudent, $cloudCourse],
            [$student6, $cloudCourse],
            [$student, $cybersecurityCourse],
            [$secondStudent, $cybersecurityCourse],
            [$student7, $cybersecurityCourse],
            [$student, $blockchainCourse],
            [$secondStudent, $blockchainCourse],
            [$student8, $blockchainCourse],
        ];

        foreach ($studentsToCheck as [$user, $course]) {
            app(CourseCertificateIssuer::class)->issueIfEligible($course, $user);
        }

        // Quiz attempts for new courses
        QuizAttempt::create([
            'quiz_id' => $designQuiz->id,
            'user_id' => $student->id,
            'score' => 90,
            'passed' => true,
            'answers' => [
                (string) $designQuizQuestion1->id => 'understand_users',
                (string) $designQuizQuestion2->id => ['color_contrast', 'keyboard_nav', 'alt_text'],
            ],
            'started_at' => now()->subDays(18),
            'completed_at' => now()->subDays(18),
        ]);

        QuizAttempt::create([
            'quiz_id' => $designQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 75,
            'passed' => true,
            'answers' => [
                (string) $designQuizQuestion1->id => 'understand_users',
                (string) $designQuizQuestion2->id => ['color_contrast', 'keyboard_nav'],
            ],
            'started_at' => now()->subDays(16),
            'completed_at' => now()->subDays(16),
        ]);

        QuizAttempt::create([
            'quiz_id' => $dataScienceQuiz->id,
            'user_id' => $student->id,
            'score' => 85,
            'passed' => true,
            'answers' => [
                (string) $dataScienceQuizQuestion1->id => 'remove_errors',
                (string) $dataScienceQuizQuestion2->id => ['matplotlib', 'seaborn'],
            ],
            'started_at' => now()->subDays(15),
            'completed_at' => now()->subDays(15),
        ]);

        QuizAttempt::create([
            'quiz_id' => $dataScienceQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 95,
            'passed' => true,
            'answers' => [
                (string) $dataScienceQuizQuestion1->id => 'remove_errors',
                (string) $dataScienceQuizQuestion2->id => ['matplotlib', 'seaborn'],
            ],
            'started_at' => now()->subDays(12),
            'completed_at' => now()->subDays(12),
        ]);

        QuizAttempt::create([
            'quiz_id' => $mobileQuiz->id,
            'user_id' => $student->id,
            'score' => 70,
            'passed' => true,
            'answers' => [
                (string) $mobileQuizQuestion1->id => 'cross_platform',
                (string) $mobileQuizQuestion2->id => ['components', 'state', 'flexbox'],
            ],
            'started_at' => now()->subDays(12),
            'completed_at' => now()->subDays(12),
        ]);

        QuizAttempt::create([
            'quiz_id' => $mobileQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 80,
            'passed' => true,
            'answers' => [
                (string) $mobileQuizQuestion1->id => 'cross_platform',
                (string) $mobileQuizQuestion2->id => ['components', 'state'],
            ],
            'started_at' => now()->subDays(10),
            'completed_at' => now()->subDays(10),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cloudQuiz->id,
            'user_id' => $student->id,
            'score' => 90,
            'passed' => true,
            'answers' => [
                (string) $cloudQuizQuestion1->id => 'elastic_compute_cloud',
                (string) $cloudQuizQuestion2->id => ['s3', 'ebs'],
            ],
            'started_at' => now()->subDays(8),
            'completed_at' => now()->subDays(8),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cloudQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 85,
            'passed' => true,
            'answers' => [
                (string) $cloudQuizQuestion1->id => 'elastic_compute_cloud',
                (string) $cloudQuizQuestion2->id => ['s3', 'ebs'],
            ],
            'started_at' => now()->subDays(6),
            'completed_at' => now()->subDays(6),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cybersecurityQuiz->id,
            'user_id' => $student->id,
            'score' => 80,
            'passed' => true,
            'answers' => [
                (string) $cybersecurityQuizQuestion1->id => 'protect_data',
                (string) $cybersecurityQuizQuestion2->id => ['phishing', 'ddos', 'sql_injection'],
            ],
            'started_at' => now()->subDays(4),
            'completed_at' => now()->subDays(4),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cybersecurityQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 90,
            'passed' => true,
            'answers' => [
                (string) $cybersecurityQuizQuestion1->id => 'protect_data',
                (string) $cybersecurityQuizQuestion2->id => ['phishing', 'ddos', 'sql_injection'],
            ],
            'started_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        QuizAttempt::create([
            'quiz_id' => $blockchainQuiz->id,
            'user_id' => $student->id,
            'score' => 75,
            'passed' => true,
            'answers' => [
                (string) $blockchainQuizQuestion1->id => 'solidity',
                (string) $blockchainQuizQuestion2->id => ['distributed_ledger', 'consensus_mechanism', 'cryptographic_hashing'],
            ],
            'started_at' => now()->subDays(2),
            'completed_at' => now()->subDays(2),
        ]);

        QuizAttempt::create([
            'quiz_id' => $blockchainQuiz->id,
            'user_id' => $secondStudent->id,
            'score' => 85,
            'passed' => true,
            'answers' => [
                (string) $blockchainQuizQuestion1->id => 'solidity',
                (string) $blockchainQuizQuestion2->id => ['distributed_ledger', 'consensus_mechanism', 'cryptographic_hashing'],
            ],
            'started_at' => now()->subDay(),
            'completed_at' => now()->subDay(),
        ]);

        // Quiz attempts for new students
        QuizAttempt::create([
            'quiz_id' => $designQuiz->id,
            'user_id' => $student3->id,
            'score' => 95,
            'passed' => true,
            'answers' => [
                (string) $designQuizQuestion1->id => 'understand_users',
                (string) $designQuizQuestion2->id => ['color_contrast', 'keyboard_nav', 'alt_text'],
            ],
            'started_at' => now()->subDays(25),
            'completed_at' => now()->subDays(25),
        ]);

        QuizAttempt::create([
            'quiz_id' => $dataScienceQuiz->id,
            'user_id' => $student4->id,
            'score' => 88,
            'passed' => true,
            'answers' => [
                (string) $dataScienceQuizQuestion1->id => 'remove_errors',
                (string) $dataScienceQuizQuestion2->id => ['matplotlib', 'seaborn'],
            ],
            'started_at' => now()->subDays(20),
            'completed_at' => now()->subDays(20),
        ]);

        QuizAttempt::create([
            'quiz_id' => $mobileQuiz->id,
            'user_id' => $student5->id,
            'score' => 72,
            'passed' => true,
            'answers' => [
                (string) $mobileQuizQuestion1->id => 'cross_platform',
                (string) $mobileQuizQuestion2->id => ['components', 'state', 'flexbox'],
            ],
            'started_at' => now()->subDays(15),
            'completed_at' => now()->subDays(15),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cloudQuiz->id,
            'user_id' => $student6->id,
            'score' => 92,
            'passed' => true,
            'answers' => [
                (string) $cloudQuizQuestion1->id => 'elastic_compute_cloud',
                (string) $cloudQuizQuestion2->id => ['s3', 'ebs'],
            ],
            'started_at' => now()->subDays(10),
            'completed_at' => now()->subDays(10),
        ]);

        QuizAttempt::create([
            'quiz_id' => $cybersecurityQuiz->id,
            'user_id' => $student7->id,
            'score' => 85,
            'passed' => true,
            'answers' => [
                (string) $cybersecurityQuizQuestion1->id => 'protect_data',
                (string) $cybersecurityQuizQuestion2->id => ['phishing', 'ddos', 'sql_injection'],
            ],
            'started_at' => now()->subDays(8),
            'completed_at' => now()->subDays(8),
        ]);

        QuizAttempt::create([
            'quiz_id' => $blockchainQuiz->id,
            'user_id' => $student8->id,
            'score' => 78,
            'passed' => true,
            'answers' => [
                (string) $blockchainQuizQuestion1->id => 'solidity',
                (string) $blockchainQuizQuestion2->id => ['distributed_ledger', 'consensus_mechanism', 'cryptographic_hashing'],
            ],
            'started_at' => now()->subDays(5),
            'completed_at' => now()->subDays(5),
        ]);

        QuizAttempt::create([
            'quiz_id' => $laravelQuiz->id,
            'user_id' => $student9->id,
            'score' => 95,
            'passed' => true,
            'answers' => [
                (string) $sanctumQuestion->id => 'sanctum',
                (string) $backendQuestion->id => ['middleware', 'policies'],
            ],
            'started_at' => now()->subDays(3),
            'completed_at' => now()->subDays(3),
        ]);

        QuizAttempt::create([
            'quiz_id' => $reactQuiz->id,
            'user_id' => $student10->id,
            'score' => 88,
            'passed' => true,
            'answers' => [
                (string) $reactQuestion1->id => 'hooks',
                (string) $reactQuestion2->id => ['virtual_dom', 'jsx'],
            ],
            'started_at' => now()->subDays(1),
            'completed_at' => now()->subDays(1),
        ]);

        $this->command?->info('Seeded accounts (password: password)');
        $this->command?->line('admin@techtutor.test');
        $this->command?->line('backend@techtutor.test');
        $this->command?->line('frontend@techtutor.test');
        $this->command?->line('ml@techtutor.test');
        $this->command?->line('devops@techtutor.test');
        $this->command?->line('design@techtutor.test');
        $this->command?->line('datascience@techtutor.test');
        $this->command?->line('mobile@techtutor.test');
        $this->command?->line('student@techtutor.test');
        $this->command?->line('student2@techtutor.test');
        $this->command?->line('banned@techtutor.test');
        $this->command?->info(sprintf('Demo content created on 2026-06-01 10:30:00 by %s, %s, %s, %s, %s, %s, %s, and %s for %s, %s, and admin views.', $backendInstructor->email, $frontendInstructor->email, $mlInstructor->email, $devopsInstructor->email, $designInstructor->email, $dataScienceInstructor->email, $mobileInstructor->email, $extraInstructor->email, $student->email, $secondStudent->email));
    }

    private function createUser(array $attributes): User
    {
        $email = $attributes['email'];
        $name = $attributes['name'] ?? $email;
        $baseNickname = $attributes['nickname'] ?? $name;

        return User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'nickname' => Str::slug($baseNickname, '-') ?: 'user',
                'email_verified_at' => $attributes['email_verified_at'] ?? now(),
                'password' => $attributes['password'] ?? Hash::make('password'),
                'role' => $attributes['role'] ?? 'student',
                'bio' => $attributes['bio'] ?? null,
                'is_banned' => $attributes['is_banned'] ?? false,
                'banned_at' => $attributes['banned_at'] ?? null,
                'email_notifications_enabled' => $attributes['email_notifications_enabled'] ?? true,
                'email_notifications_comment_reply' => $attributes['email_notifications_comment_reply'] ?? true,
                'email_notifications_thread' => $attributes['email_notifications_thread'] ?? true,
                'email_notifications_quiz_result' => $attributes['email_notifications_quiz_result'] ?? true,
                'email_notifications_new_course' => $attributes['email_notifications_new_course'] ?? false,
                'email_notifications_new_content' => $attributes['email_notifications_new_content'] ?? true,
                'email_notifications_new_enrollment' => $attributes['email_notifications_new_enrollment'] ?? true,
                'email_notifications_instructor_quiz_result' => $attributes['email_notifications_instructor_quiz_result'] ?? true,
                'email_notifications_approval_result' => $attributes['email_notifications_approval_result'] ?? true,
                'email_notifications_course_submitted' => $attributes['email_notifications_course_submitted'] ?? true,
                'email_notifications_lesson_submitted' => $attributes['email_notifications_lesson_submitted'] ?? true,
                'email_notifications_review_declined' => $attributes['email_notifications_review_declined'] ?? true,
                'remember_token' => $attributes['remember_token'] ?? Str::random(32),
            ],
        );
    }
}
